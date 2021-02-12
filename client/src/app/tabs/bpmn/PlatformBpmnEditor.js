/**
 * Copyright Camunda Services GmbH and/or licensed to Camunda Services GmbH
 * under one or more contributor license agreements. See the NOTICE file
 * distributed with this work for additional information regarding copyright
 * ownership.
 *
 * Camunda licenses this file to you under the MIT; you may not use this file
 * except in compliance with the MIT License.
 */

import BpmnEditor from './BpmnEditor';

import CamundaBpmnModeler from './modeler';

import applyDefaultTemplates from './modeler/features/apply-default-templates/applyDefaultTemplates';

import {
  findUsages as findNamespaceUsages,
  replaceUsages as replaceNamespaceUsages
} from '../util/namespace';

import {
  WithCache,
  WithCachedState
} from '../../cached';


const NAMESPACE_URL_ACTIVITI = 'http://activiti.org/bpmn';

const NAMESPACE_CAMUNDA = {
  uri: 'http://camunda.org/schema/1.0/bpmn',
  prefix: 'camunda'
};

export class PlatformBpmnEditor extends BpmnEditor {

  constructor(props) {
    super(props);

    this.state = {};
  }

  async componentDidMount() {
    this._isMounted = true;

    const {
      layout
    } = this.props;

    const modeler = this.getModeler();

    this.listen('on');

    modeler.attachTo(this.ref.current);

    const minimap = modeler.get('minimap');

    if (layout.minimap) {
      minimap.toggle(layout.minimap && !!layout.minimap.open);
    }

    const propertiesPanel = modeler.get('propertiesPanel');

    propertiesPanel.attachTo(this.propertiesPanelRef.current);

    try {
      await this.loadTemplates();
    } catch (error) {
      this.handleError({ error });
    }

    this.checkImport();
  }

  async loadTemplates() {
    const { getConfig } = this.props;

    const modeler = this.getModeler();

    const templatesLoader = modeler.get('elementTemplatesLoader');

    const templates = await getConfig('bpmn.elementTemplates');

    templatesLoader.setTemplates(templates);

    const propertiesPanel = modeler.get('propertiesPanel', false);

    if (propertiesPanel) {
      const currentElement = propertiesPanel._current && propertiesPanel._current.element;

      if (currentElement) {
        propertiesPanel.update(currentElement);
      }
    }
  }

  handleElementTemplateErrors = (event) => {
    const {
      errors
    } = event;

    errors.forEach(error => {
      this.handleError({ error });
    });
  }

  handleNamespace = async (xml) => {
    const used = findNamespaceUsages(xml, NAMESPACE_URL_ACTIVITI);

    if (!used) {
      return xml;
    }

    const shouldConvert = await this.shouldConvert();

    if (!shouldConvert) {
      return xml;
    }

    const {
      onContentUpdated
    } = this.props;

    const convertedXML = await replaceNamespaceUsages(xml, used, NAMESPACE_CAMUNDA);

    onContentUpdated(convertedXML);

    return convertedXML;
  }

  async shouldConvert() {
    const { button } = await this.props.onAction('show-dialog', getNamespaceDialog());

    return button === 'yes';
  }

  handleImport = (error, warnings) => {
    const {
      isNew,
      onImport,
      xml
    } = this.props;

    let {
      defaultTemplatesApplied
    } = this.getCached();

    const modeler = this.getModeler();

    const commandStack = modeler.get('commandStack');

    const stackIdx = commandStack._stackIdx;

    if (error) {
      this.setCached({
        defaultTemplatesApplied: false,
        lastXML: null
      });
    } else {

      if (isNew && !defaultTemplatesApplied) {
        modeler.invoke(applyDefaultTemplates);

        defaultTemplatesApplied = true;
      }

      this.setCached({
        defaultTemplatesApplied,
        lastXML: xml,
        stackIdx
      });

      this.setState({
        importing: false
      });
    }

    onImport(error, warnings);
  }

  async importXML() {
    const {
      xml
    } = this.props;

    this.setState({
      importing: true
    });

    const modeler = this.getModeler();

    const importedXML = await this.handleNamespace(xml);


    let error = null, warnings = null;
    try {

      const result = await modeler.importXML(importedXML);
      warnings = result.warnings;
    } catch (err) {

      error = err;
      warnings = err.warnings;
    }

    if (this._isMounted) {
      this.handleImport(error, warnings);
    }
  }

  /**
   * @returns {CamundaBpmnModeler}
   */
  getModeler() {
    const {
      modeler
    } = this.getCached();

    return modeler;
  }

  triggerAction = (action, context) => {

    if (action === 'elementTemplates.reload') {
      return this.loadTemplates();
    }

    return super.triggerAction(action, context);
  }

  static createCachedState(props) {
    this.Modeler = CamundaBpmnModeler;

    return super.createCachedState({
      ...props,
      additionalProps: {
        namespaceDialogShown: false,
        templatesLoaded: false
      }
    });
  }

}


export default WithCache(WithCachedState(PlatformBpmnEditor));

// helpers //////////

function getNamespaceDialog() {
  return {
    type: 'warning',
    title: 'Deprecated <activiti> namespace detected',
    buttons: [
      { id: 'cancel', label: 'Cancel' },
      { id: 'yes', label: 'Yes' }
    ],
    message: 'Would you like to convert your diagram to the <camunda> namespace?',
    detail: [
      'This will allow you to maintain execution related properties.',
      '',
      '<camunda> namespace support works from Camunda BPM versions 7.4.0, 7.3.3, 7.2.6 onwards.'
    ].join('\n')
  };
}
