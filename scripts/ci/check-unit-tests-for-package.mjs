#!/usr/bin/env node

/**
 * @license Copyright (c) 2003-2024, CKSource Holding sp. z o.o. All rights reserved.
 * For licensing, see LICENSE.md or https://ckeditor.com/legal/ckeditor-oss-license
 */

/* eslint-env node */

import { execSync } from 'child_process';
import fs from 'fs/promises';
import { glob } from 'glob';
import minimist from 'minimist';
import { CKEDITOR5_ROOT_PATH } from '../constants.mjs';

main()
	.catch( err => {
		console.error( err );

		process.exit( 1 );
	} );

async function main() {
	const { packageName, checkCoverage, allowNonFullCoverage, coverageFile, retries } = getOptions( process.argv.slice( 2 ) );

	runTests( { packageName, checkCoverage, retries } );

	if ( checkCoverage && !allowNonFullCoverage ) {
		const exitCode = checkCodeCoverage();

		if ( coverageFile ) {
			const matches = await glob( 'coverage/*/lcov.info' );

			for ( const filePath of matches ) {
				const buffer = await fs.readFile( filePath );

				await fs.writeFile( coverageFile, buffer, { flag: 'as' } );
			}
		}

		process.exit( exitCode );
	}
}

/**
 * @param {Object} options
 * @param {String} options.packageName
 * @param {Boolean} options.checkCoverage
 * @param {Number} options.retries
 */
function runTests( { packageName, checkCoverage, retries = 3 } ) {
	const shortName = packageName.replace( /^ckeditor5?-/, '' );

	const testCommand = [
		'yarn',
		'test',
		'--reporter=dots',
		'--production',
		`-f ${ shortName }`,
		checkCoverage ? '--coverage' : null
	].filter( Boolean );

	for ( let retry = 0; retry < retries; retry++ ) {
		try {
			execSync( testCommand.join( ' ' ), {
				cwd: CKEDITOR5_ROOT_PATH,
				stdio: 'inherit'
			} );

			break;
		} catch ( err ) {
			if ( retry === retries ) {
				throw err;
			} else {
				console.error( err );
				console.log( `\n⚠️ Retry ${ retry + 1 } of ${ retries } for ${ packageName }!` );
			}
		}
	}
}

function checkCodeCoverage() {
	execSync( 'cp coverage/*/coverage-final.json .nyc_output', {
		cwd: CKEDITOR5_ROOT_PATH,
		stdio: 'inherit'
	} );

	try {
		execSync( 'npx nyc check-coverage --branches 100 --functions 100 --lines 100 --statements 100', {
			cwd: CKEDITOR5_ROOT_PATH,
			stdio: 'inherit'
		} );
	} catch ( err ) {
		return 1;
	}

	return 0;
}

/**
 * @param {Array.<String>} argv
 * @returns {Object} options
 * @returns {String} options.packageName
 * @returns {Boolean} options.checkCoverage
 * @returns {Boolean} options.allowNonFullCoverage
 * @returns {String|null} options.coverageFile
 * @returns {Number} options.retries
 */
function getOptions( argv ) {
	const options = minimist( argv, {
		string: [
			'package-name',
			'coverage-file'
		],
		boolean: [
			'check-coverage',
			'allow-non-full-coverage'
		],
		default: {
			'allow-non-full-coverage': false,
			'coverage-file': null
		}
	} );

	options.retries = Number( options.retries ?? 3 );
	options.packageName = options[ 'package-name' ];
	options.coverageFile = options[ 'coverage-file' ];
	options.checkCoverage = options[ 'check-coverage' ];
	options.allowNonFullCoverage = options[ 'allow-non-full-coverage' ];

	return options;
}
