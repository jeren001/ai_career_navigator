import { httpsUrl, inputText } from './account-input.js';
import { skillsBody, skillsError } from './user-skills.js';

const contactLimits = { full_name: 120, email: 254, phone: 60, location: 160, website: 2048 };
const headings = new Map([
  ['skills', 'skills'], ['technical skills', 'skills'], ['技能', 'skills'], ['专业技能', 'skills'],
  ['education', 'education'], ['教育经历', 'education'], ['教育背景', 'education'],
  ['experience', 'work_experience'], ['work experience', 'work_experience'], ['工作经历', 'work_experience'], ['实习经历', 'work_experience'],
  ['projects', 'projects'], ['项目经历', 'projects'], ['项目经验', 'projects'],
  ['certifications', 'certifications'], ['证书', 'certifications'], ['资格证书', 'certifications'],
]);
const emailPattern = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i;

export const editorFields = ['contact', 'styling', 'custom_sections', 'draft_progress'];

export function resumeEditorFields({ contact, styling, custom_sections: custom, draft_progress: progress }) {
  const contactFields = Object.entries(skillsBody(contact === undefined ? {} : contact, Object.keys(contactLimits)))
    .map(([field, value]) => {
      if (value === null) return [field, null];
      const text = field === 'website' ? httpsUrl(value, field) : inputText(value, field, contactLimits[field]);
      if (field === 'email' && text.match(emailPattern)?.[0] !== text) throw skillsError(400, 'Invalid contact email');
      return [field, text];
    });
  const style = skillsBody(styling === undefined ? {} : styling, ['template', 'font_family', 'accent_color', 'font_size']);
  const validatedStyle = {};
  for (const [field, value] of Object.entries(style)) {
    if (value === null) validatedStyle[field] = null;
    else if (field === 'font_size') {
      if (!Number.isInteger(value) || value < 8 || value > 24) throw skillsError(400, 'font_size must be an integer from 8 to 24');
      validatedStyle[field] = value;
    } else if (field === 'accent_color') {
      if (typeof value !== 'string' || !/^#[0-9a-f]{6}$/i.test(value)) throw skillsError(400, 'accent_color must be a six-digit hex color');
      validatedStyle[field] = value;
    } else {
      const label = inputText(value, field, 60);
      if (!/^[\p{L}\p{N} _-]+$/u.test(label)) throw skillsError(400, 'Invalid style name');
      validatedStyle[field] = label;
    }
  }
  let sections;
  if (custom !== undefined) {
    if (!Array.isArray(custom) || custom.length > 10) throw skillsError(400, 'custom_sections must contain up to 10 sections');
    sections = custom.map((item) => {
      const { title, content } = skillsBody(item, ['title', 'content']);
      return { title: inputText(title, 'section title', 120), content: inputText(content, 'section content', 4000) };
    });
  }
  const draft = { ...skillsBody(progress === undefined ? {} : progress, ['current_step', 'completed_steps']) };
  if (Object.hasOwn(draft, 'current_step') && draft.current_step !== null) {
    draft.current_step = inputText(draft.current_step, 'current_step', 80);
  }
  if (Object.hasOwn(draft, 'completed_steps')) {
    if (!Array.isArray(draft.completed_steps) || draft.completed_steps.length > 20) {
      throw skillsError(400, 'completed_steps must be an array of up to 20 steps');
    }
    draft.completed_steps = [...new Set(draft.completed_steps.map((step) => inputText(step, 'completed step', 80)))];
  }
  return { contact: Object.fromEntries(contactFields), styling: validatedStyle, custom: sections, progress: draft };
}

export function extractResumeFields(text) {
  const contact = {};
  const sections = {};
  const lines = text.split('\n').map((line) => line.trim()).filter(Boolean);
  let current;
  for (const line of lines) {
    const inline = /^(.{1,40}?)[：:]\s*(.*)$/u.exec(line);
    const heading = headings.get((inline?.[1] ?? line).trim().toLowerCase());
    if (heading) {
      current = heading;
      if (!inline?.[2]) continue;
    }
    const content = (heading ? inline[2] : line).replace(/^[•●▪*-]\s*/u, '').trim();
    if (!content) continue;
    if (!current) {
      const email = content.match(emailPattern)?.[0];
      if (email && email.length <= 254) contact.email ??= email;
      const phone = /^(?:phone|tel|电话|手机)[：:]\s*(\+?[\d ()-]{7,30})$/iu.exec(content)?.[1];
      const name = /^(?:name|姓名)[：:]\s*(.{1,120})$/iu.exec(content)?.[1];
      if (phone) contact.phone ??= phone;
      if (name) contact.full_name ??= name;
      continue;
    }
    const entries = sections[current] ??= [];
    const values = current === 'skills' ? content.split(/[,，、;；]/u) : [content];
    for (const raw of values) {
      const value = raw.trim();
      if (!value || entries.length >= 25) continue;
      const characters = [...value];
      entries.push({
        name: characters.slice(0, 120).join(''),
        ...(characters.length > 120 && { details: characters.slice(0, 500).join('') }),
      });
    }
  }
  return { contact, sections, requires_review: true };
}
