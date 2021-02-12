/**
 * Copyright Camunda Services GmbH and/or licensed to Camunda Services GmbH
 * under one or more contributor license agreements. See the NOTICE file
 * distributed with this work for additional information regarding copyright
 * ownership.
 *
 * Camunda licenses this file to you under the MIT; you may not use this file
 * except in compliance with the MIT License.
 */

/* global sinon */

import React from 'react';

import { mount } from 'enzyme';

import {
  Cache,
  WithCachedState
} from '../../../cached';

import {
  BpmnEditor
} from '../BpmnEditor';

import BpmnModeler from 'test/mocks/bpmn-js/Modeler';

import diagramXML from './diagram.bpmn';
import activitiXML from './activiti.bpmn';
import activitiConvertedXML from './activitiConverted.bpmn';

import applyDefaultTemplates from
  '../modeler/features/apply-default-templates/applyDefaultTemplates';

const { spy } = sinon;


describe('<PlatformBpmnEditor>', function() {

  it('should render', async function() {
    const {
      instance
    } = await renderEditor(diagramXML);

    expect(instance).to.exist;
  });


  describe('#handleNamespace', function() {

    it('should replace namespace', function(done) {

      // given
      const onContentUpdated = sinon.spy();
      const onAction = sinon.stub().resolves({
        button: 'yes'
      });

      // when
      renderEditor(activitiXML, {
        onAction,
        onContentUpdated,
        onImport
      });

      // then
      function onImport() {
        try {
          expect(onContentUpdated).to.be.calledOnce;
          expect(onContentUpdated).to.be.calledWith(activitiConvertedXML);

          done();
        } catch (error) {
          done(error);
        }
      }
    });


    it('should not convert the diagram if declined', function(done) {

      // given
      const onContentUpdated = sinon.spy();
      const onAction = sinon.stub().resolves('cancel');

      // when
      renderEditor(activitiXML, {
        onAction,
        onContentUpdated,
        onImport
      });

      // then
      function onImport() {
        try {
          expect(onContentUpdated).to.not.have.been.called;

          done();
        } catch (error) {
          done(error);
        }
      }
    });


    it('should not ask for permission if diagram does not have seeked namespace', function(done) {

      // given
      const onContentUpdated = sinon.spy();
      const onAction = sinon.spy();

      // when
      renderEditor(diagramXML, {
        onAction,
        onContentUpdated,
        onImport
      });

      // then
      function onImport() {
        try {
          expect(onContentUpdated).to.not.have.been.called;
          expect(onAction).to.not.have.been.calledWith('show-dialog');

          done();
        } catch (error) {
          done(error);
        }
      }
    });


    it('should not fail import for broken diagrams', function(done) {

      // given
      const onContentUpdated = sinon.spy();
      const onAction = sinon.stub().resolves('yes');

      // when
      renderEditor('broken-diagram', {
        onAction,
        onContentUpdated,
        onImport
      });

      // then
      function onImport() {
        try {
          expect(onContentUpdated).to.have.not.been.called;

          done();
        } catch (error) {
          done(error);
        }
      }
    });

  });


  describe('element templates', function() {

    it('should load templates when mounted', async function() {

      // given
      const getConfigSpy = sinon.spy(),
            elementTemplatesLoaderMock = { setTemplates() {} };

      const cache = new Cache();

      cache.add('editor', {
        cached: {
          modeler: new BpmnModeler({
            modules: {
              elementTemplatesLoader: elementTemplatesLoaderMock
            }
          })
        }
      });

      // when
      await renderEditor(diagramXML, {
        cache,
        getConfig: getConfigSpy
      });

      // expect
      expect(getConfigSpy).to.be.called;
      expect(getConfigSpy).to.be.calledWith('bpmn.elementTemplates');
    });


    it('should reload templates on action triggered', async function() {

      // given
      const getConfigSpy = sinon.spy(),
            elementTemplatesLoaderStub = sinon.stub({ setTemplates() {} });

      const cache = new Cache();

      cache.add('editor', {
        cached: {
          modeler: new BpmnModeler({
            modules: {
              elementTemplatesLoader: elementTemplatesLoaderStub
            }
          })
        }
      });

      // when
      const { instance } = await renderEditor(diagramXML, {
        cache,
        getConfig: getConfigSpy
      });

      const propertiesPanel = instance.getModeler().get('propertiesPanel');

      const updateSpy = spy(propertiesPanel, 'update');

      await instance.triggerAction('elementTemplates.reload');

      // expect
      expect(getConfigSpy).to.be.calledTwice;
      expect(getConfigSpy).to.be.always.calledWith('bpmn.elementTemplates');
      expect(elementTemplatesLoaderStub.setTemplates).to.be.calledTwice;
      expect(updateSpy).to.have.been.called;
    });


    it('should apply default templates to unsaved diagram', function(done) {

      // given
      const modeler = new BpmnModeler();

      const invokeSpy = sinon.spy(modeler, 'invoke');

      const cache = new Cache();

      cache.add('editor', {
        cached: {
          modeler
        }
      });

      function onImport() {

        try {
          expect(invokeSpy).to.have.been.calledWith(applyDefaultTemplates);
        } catch (error) {
          return done(error);
        }

        done();
      }

      // when
      renderEditor(diagramXML, {
        isNew: true,
        cache,
        onImport
      });
    });


    it('should NOT apply default templates to unsaved diagram twice', function(done) {

      // given
      const modeler = new BpmnModeler();

      const invokeSpy = sinon.spy(modeler, 'invoke');

      const cache = new Cache();

      cache.add('editor', {
        cached: {
          modeler,
          defaultTemplatesApplied: true
        }
      });

      function onImport() {

        try {
          expect(invokeSpy).not.to.have.been.called;
        } catch (error) {
          return done(error);
        }

        done();
      }

      // when
      renderEditor(diagramXML, {
        isNew: true,
        cache,
        onImport
      });
    });


    it('should NOT apply default templates to saved diagram', function(done) {

      // given
      const modeler = new BpmnModeler();

      const invokeSpy = sinon.spy(modeler, 'invoke');

      const cache = new Cache();

      cache.add('editor', {
        cached: {
          modeler
        }
      });

      function onImport() {

        try {
          expect(invokeSpy).not.to.have.been.called;
        } catch (error) {
          return done(error);
        }

        done();
      }

      // when
      renderEditor(diagramXML, {
        isNew: false,
        cache,
        onImport
      });
    });

  });

});


// helpers //////////

function noop() {}

const TestEditor = WithCachedState(BpmnEditor);

async function renderEditor(xml, options = {}) {
  const {
    id,
    layout,
    onAction,
    onChanged,
    onContentUpdated,
    onError,
    onImport,
    onLayoutChanged,
    onModal,
    getConfig,
    getPlugins,
    isNew
  } = options;

  const wrapper = await mount(
    <TestEditor
      id={ id || 'editor' }
      xml={ xml }
      isNew={ isNew !== false }
      activeSheet={ options.activeSheet || { id: 'bpmn' } }
      onAction={ onAction || noop }
      onChanged={ onChanged || noop }
      onError={ onError || noop }
      onImport={ onImport || noop }
      onLayoutChanged={ onLayoutChanged || noop }
      onContentUpdated={ onContentUpdated || noop }
      onModal={ onModal || noop }
      getConfig={ getConfig || noop }
      getPlugins={ getPlugins || (() => []) }
      cache={ options.cache || new Cache() }
      layout={ layout || {
        minimap: {
          open: false
        },
        propertiesPanel: {
          open: true
        }
      } }
    />
  );

  const instance = wrapper.find(BpmnEditor).instance();

  return {
    instance,
    wrapper
  };
}