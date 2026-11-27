import { useId, useState } from 'react'
import { LayoutTemplate } from 'lucide-react'
import TemplateSelection from '../TemplateSelection'
import DesignPanel from './design/DesignPanel'
import { DEFAULT_TEMPLATE_ID, getTemplateById } from './templates/templateCatalog'
import CVPreview from './preview/CVPreview'
import InternationalPanel from './international/InternationalPanel'
import SectionsPanel from './sections/SectionsPanel'
import StudioNavigation from './StudioNavigation'
import '../../../../styles/cv-design-studio.css'

const panels = {
  templates: {
    title: 'Templates',
    description: 'Choose a professional template that matches your career goals.'
  },
  design: {
    title: 'Design',
    description: 'Customize the appearance of your CV.'
  },
  sections: {
    title: 'Sections',
    description: 'Edit, arrange, and manage the sections in your CV.'
  },
  international: {
    title: 'International Format',
    description: 'Choose a target market and localize the document.'
  }
}

export default function CVDesignStudio({ cvData, exportTitle, onChange, onDesignChange, onDataChange, validateStep, onSectionEditingChange, sectionEditing, onPhotoPendingChange, photoPending }) {
  const [activePanel, setActivePanel] = useState('templates')

  function changePanel(panelId) {
    if (panelId === activePanel) return
    if (sectionEditing && !window.confirm('Discard the unconfirmed section edit?')) return
    if (photoPending && !window.confirm('Leave before the photo finishes loading?')) return
    setActivePanel(panelId)
  }

  const id = useId()
  const panelId = `${id}-panel`
  const panel = panels[activePanel]
  const template = getTemplateById(cvData.template) ?? getTemplateById(DEFAULT_TEMPLATE_ID)

  return (
    <section className="cv-studio" aria-labelledby={`${id}-title`}>
      <header className="cv-form-section-header">
        <LayoutTemplate size={24} aria-hidden="true" />
        <div>
          <h2 id={`${id}-title`}>CV Design Studio</h2>
          <p>Template &amp; Create</p>
        </div>
      </header>

      <StudioNavigation
        activePanel={activePanel}
        onPanelChange={changePanel}
        panelId={panelId}
      />

      <div className="cv-studio-workspace">
        <section className="cv-studio-panel" id={panelId} aria-labelledby={`${id}-panel-title`}>
          <h3 id={`${id}-panel-title`}>{panel.title}</h3>
          <p>{panel.description}</p>

          {activePanel === 'templates' && (
            <TemplateSelection selectedTemplate={cvData.template} onChange={onChange} />
          )}
          {activePanel === 'design' && (
            <DesignPanel template={template} overrides={cvData.design} onChange={onDesignChange} onPhotoPendingChange={onPhotoPendingChange} />
          )}
          {activePanel === 'sections' && (
            <SectionsPanel cvData={cvData} template={template} onChange={onDataChange} validateStep={validateStep} onEditingChange={onSectionEditingChange} />
          )}
          {activePanel === 'international' && (
            <InternationalPanel cvData={cvData} template={template} onChange={onDataChange} />
          )}
        </section>

        <CVPreview cvData={cvData} template={template} exportTitle={exportTitle} titleId={`${id}-preview-title`} />
      </div>


    </section>
  )
}
