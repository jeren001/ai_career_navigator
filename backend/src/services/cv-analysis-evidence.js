import { extractResumeFields } from './resume-editor.js';

export const sections = [
  'personal_information', 'professional_summary', 'work_experience', 'education', 'skills', 'languages',
  'certifications', 'projects', 'volunteering', 'other',
];

const headings = [
  ['personal_information', /^(?:contact(?: information)?|personal information|个人信息|联系方式)$/iu],
  ['professional_summary', /^(?:summary|professional summary|profile|objective|个人简介|自我评价|职业目标)$/iu],
  ['work_experience', /^(?:experience|work experience|employment|professional experience|工作经历|工作经验|实习经历)$/iu],
  ['education', /^(?:education|academic background|教育经历|教育背景|教育)$/iu],
  ['skills', /^(?:skills|technical skills|core competencies|技能|专业技能)$/iu],
  ['languages', /^(?:languages|language skills|语言|语言能力)$/iu],
  ['certifications', /^(?:certifications|certificates|证书|资格证书)$/iu],
  ['projects', /^(?:projects|selected projects|项目|项目经历|项目经验)$/iu],
  ['volunteering', /^(?:volunteering|volunteer experience|志愿服务|志愿经历)$/iu],
  ['other', /^(?:awards|publications|interests|other|荣誉|成果|兴趣爱好|其他)$/iu],
];

const privacy = /\b[\w.+-]+@[\w.-]+\.[a-z]{2,}\b|(?:https?:\/\/|www\.)\S+|(?:\+?\d[ ()-]*){8,}/giu;
const contactLabel = /^(?:name|full name|姓名|location|地址|住址|phone|tel|电话|手机|email|邮箱|date of birth|出生日期)\s*[:：]/iu;

export function cvEvidence(resume) {
  const text = resume.extracted_text;
  const extractedContact = text ? extractResumeFields(text).contact : {};
  const contact = text ? extractedContact : resume.contact ?? {};
  const rawSections = new Set();
  const candidates = [];
  const privateValues = [...Object.values(extractedContact), ...Object.values(resume.contact ?? {})]
    .filter((value) => typeof value === 'string' && value.length >= 2);
  function add(section, raw) {
    if (section === 'personal_information' || contactLabel.test(raw)) return;
    const redacted = privateValues.reduce((value, part) => value.replaceAll(part, '[…]'), raw).replace(privacy, '[…]').trim();
    const excerpt = [...redacted].slice(0, 280).join('');
    if (/[\p{L}\p{N}]/u.test(excerpt)) candidates.push({ section, text: excerpt });
  }

  if (text) {
    let section = 'other';
    let headingSeen = false;
    for (const line of text.split('\n').map((value) => value.trim()).filter(Boolean)) {
      const [label, ...inline] = line.split(/[:：]/u);
      const recognized = headings.find(([, pattern]) => pattern.test(label.trim()));
      if (recognized) {
        section = recognized[0];
        headingSeen = true;
        rawSections.add(section);
        if (inline.length) add(section, inline.join(':').trim());
      } else {
        // A short unlabelled line at the top can be the applicant's name.
        if (headingSeen || line.length >= 45) add(section, line);
      }
    }
  } else {
    for (const [section, items] of Object.entries(resume.sections)) {
      for (const item of items) add(section, [item.name, item.organization, item.dates, item.details].filter(Boolean).join(' — '));
      if (items.length) rawSections.add(section);
    }
    for (const { title, content } of resume.custom_sections ?? []) {
      const section = headings.find(([, pattern]) => pattern.test(title))?.[0] ?? 'other';
      rawSections.add(section);
      add(section, content);
    }
  }

  const hasContact = Boolean(contact.email || contact.phone || text?.match(/\b[\w.+-]+@[\w.-]+\.[a-z]{2,}\b/iu));
  const hasPersonalInfo = hasContact || Object.values(contact).some(Boolean);
  if (hasPersonalInfo) rawSections.add('personal_information');
  const bySection = Map.groupBy(candidates, ({ section }) => section);
  const selected = [];
  for (let index = 0; index < 6; index += 1) {
    for (const section of sections) {
      const item = bySection.get(section)?.[index];
      if (item && selected.length < 30) selected.push(item);
    }
  }
  return {
    evidence: selected.map((item, index) => ({ id: index + 1, ...item })),
    sections: rawSections,
    hasContact,
    limited: selected.length < candidates.length || candidates.some(({ text: excerpt }) => [...excerpt].length === 280),
  };
}
