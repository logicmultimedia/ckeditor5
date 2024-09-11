/**
 * @license Copyright (c) 2003-2024, CKSource Holding sp. z o.o. All rights reserved.
 * For licensing, see LICENSE.md or https://ckeditor.com/legal/ckeditor-oss-license
 */

/* globals document, Event */

import BookmarkInsertFormView from '../../src/ui/bookmarkformview.js';
import View from '@ckeditor/ckeditor5-ui/src/view.js';
import { keyCodes } from '@ckeditor/ckeditor5-utils/src/keyboard.js';
import KeystrokeHandler from '@ckeditor/ckeditor5-utils/src/keystrokehandler.js';
import FocusTracker from '@ckeditor/ckeditor5-utils/src/focustracker.js';
import FocusCycler from '@ckeditor/ckeditor5-ui/src/focuscycler.js';
import ViewCollection from '@ckeditor/ckeditor5-ui/src/viewcollection.js';
import testUtils from '@ckeditor/ckeditor5-core/tests/_utils/utils.js';

describe( 'BookmarkFormView', () => {
	let view;

	testUtils.createSinonSandbox();

	beforeEach( () => {
		view = new BookmarkInsertFormView( { t: val => val } );
		view.render();
		document.body.appendChild( view.element );
	} );

	afterEach( () => {
		view.element.remove();
		view.destroy();
	} );

	describe( 'constructor()', () => {
		it( 'should create element from template', () => {
			expect( view.element.classList.contains( 'ck' ) ).to.true;
			expect( view.element.classList.contains( 'ck-bookmark-form' ) ).to.true;
			expect( view.element.classList.contains( 'ck-responsive-form' ) ).to.true;
			expect( view.element.getAttribute( 'tabindex' ) ).to.equal( '-1' );
		} );

		it( 'should create child views', () => {
			expect( view.idInputView ).to.be.instanceOf( View );
			expect( view.insertButtonView ).to.be.instanceOf( View );

			expect( view.insertButtonView.element.classList.contains( 'ck-button-insert' ) ).to.be.true;

			expect( view.children.get( 0 ) ).to.equal( view.idInputView );
			expect( view.children.get( 1 ) ).to.equal( view.insertButtonView );
		} );

		it( 'should create #focusTracker instance', () => {
			expect( view.focusTracker ).to.be.instanceOf( FocusTracker );
		} );

		it( 'should create #keystrokes instance', () => {
			expect( view.keystrokes ).to.be.instanceOf( KeystrokeHandler );
		} );

		it( 'should create #_focusCycler instance', () => {
			expect( view._focusCycler ).to.be.instanceOf( FocusCycler );
		} );

		it( 'should create #_focusables view collection', () => {
			expect( view._focusables ).to.be.instanceOf( ViewCollection );
		} );

		it( 'should create id input with inputmode=url', () => {
			expect( view.idInputView.fieldView.inputMode ).to.be.equal( 'id' );
		} );

		it( 'should fire `submit` event on insertButtonView#execute', () => {
			const spy = sinon.spy();

			view.on( 'submit', spy );

			view.insertButtonView.fire( 'execute' );

			expect( spy.calledOnce ).to.true;
		} );

		describe( 'template', () => {
			it( 'has id input view', () => {
				expect( view.template.children[ 0 ].get( 0 ) ).to.equal( view.idInputView );
			} );

			it( 'has button views', () => {
				expect( view.template.children[ 0 ].get( 1 ) ).to.equal( view.insertButtonView );
			} );
		} );
	} );

	describe( 'render()', () => {
		it( 'should register child views in #_focusables', () => {
			expect( view._focusables.map( f => f ) ).to.have.members( [
				view.idInputView,
				view.insertButtonView
			] );
		} );

		it( 'should register child views\' #element in #focusTracker', () => {
			const view = new BookmarkInsertFormView( { t: () => {} } );

			const spy = testUtils.sinon.spy( view.focusTracker, 'add' );

			view.render();

			sinon.assert.calledWithExactly( spy.getCall( 0 ), view.idInputView.element );
			sinon.assert.calledWithExactly( spy.getCall( 1 ), view.insertButtonView.element );

			view.destroy();
		} );

		it( 'starts listening for #keystrokes coming from #element', () => {
			const view = new BookmarkInsertFormView( { t: () => {} } );

			const spy = sinon.spy( view.keystrokes, 'listenTo' );

			view.render();
			sinon.assert.calledOnce( spy );
			sinon.assert.calledWithExactly( spy, view.element );

			view.destroy();
		} );

		describe( 'activates keyboard navigation for the toolbar', () => {
			it( 'so "tab" focuses the next focusable item', () => {
				const keyEvtData = {
					keyCode: keyCodes.tab,
					preventDefault: sinon.spy(),
					stopPropagation: sinon.spy()
				};

				// Mock the url input is focused.
				view.focusTracker.isFocused = true;
				view.focusTracker.focusedElement = view.idInputView.element;

				const spy = sinon.spy( view.insertButtonView, 'focus' );

				view.keystrokes.press( keyEvtData );
				sinon.assert.calledOnce( keyEvtData.preventDefault );
				sinon.assert.calledOnce( keyEvtData.stopPropagation );
				sinon.assert.calledOnce( spy );
			} );

			it( 'so "shift + tab" focuses the previous focusable item', () => {
				const keyEvtData = {
					keyCode: keyCodes.tab,
					shiftKey: true,
					preventDefault: sinon.spy(),
					stopPropagation: sinon.spy()
				};

				// Mock the cancel button is focused.
				view.focusTracker.isFocused = true;
				view.focusTracker.focusedElement = view.idInputView.element;

				const spy = sinon.spy( view.insertButtonView, 'focus' );

				view.keystrokes.press( keyEvtData );
				sinon.assert.calledOnce( keyEvtData.preventDefault );
				sinon.assert.calledOnce( keyEvtData.stopPropagation );
				sinon.assert.calledOnce( spy );
			} );
		} );
	} );

	describe( 'isValid()', () => {
		it( 'should reset error after successful validation', () => {
			const view = new BookmarkInsertFormView( { t: () => {} }, [
				() => undefined
			] );

			expect( view.isValid() ).to.be.true;
			expect( view.idInputView.errorText ).to.be.null;
		} );

		it( 'should display first error returned from validators list', () => {
			const view = new BookmarkInsertFormView( { t: () => {} }, [
				() => undefined,
				() => 'Foo bar',
				() => 'Another error'
			] );

			expect( view.isValid() ).to.be.false;
			expect( view.idInputView.errorText ).to.be.equal( 'Foo bar' );
		} );

		it( 'should pass view reference as argument to validator', () => {
			const validatorSpy = sinon.spy();
			const view = new BookmarkInsertFormView( { t: () => {} }, [ validatorSpy ] );

			view.isValid();

			expect( validatorSpy ).to.be.calledOnceWithExactly( view );
		} );
	} );

	describe( 'resetFormStatus()', () => {
		it( 'should clear form input errors', () => {
			view.idInputView.errorText = 'Error';
			view.resetFormStatus();
			expect( view.idInputView.errorText ).to.be.null;
		} );
	} );

	describe( 'destroy()', () => {
		it( 'should destroy the FocusTracker instance', () => {
			const destroySpy = sinon.spy( view.focusTracker, 'destroy' );

			view.destroy();

			sinon.assert.calledOnce( destroySpy );
		} );

		it( 'should destroy the KeystrokeHandler instance', () => {
			const destroySpy = sinon.spy( view.keystrokes, 'destroy' );

			view.destroy();

			sinon.assert.calledOnce( destroySpy );
		} );
	} );

	describe( 'DOM bindings', () => {
		describe( 'submit event', () => {
			it( 'should trigger submit event', () => {
				const spy = sinon.spy();

				view.on( 'submit', spy );
				view.element.dispatchEvent( new Event( 'submit' ) );

				expect( spy.calledOnce ).to.true;
			} );
		} );
	} );

	describe( 'focus()', () => {
		it( 'focuses the #idInputView', () => {
			const spy = sinon.spy( view.idInputView, 'focus' );

			view.focus();

			sinon.assert.calledOnce( spy );
		} );
	} );

	describe( 'ID getter', () => {
		it( 'null value should be returned in ID getter if element is null', () => {
			view.idInputView.fieldView.element = null;

			expect( view.id ).to.be.equal( null );
		} );

		it( 'trimmed DOM input value should be returned in ID getter', () => {
			view.idInputView.fieldView.element.value = '  https://cksource.com/  ';

			expect( view.id ).to.be.equal( 'https://cksource.com/' );
		} );
	} );
} );
