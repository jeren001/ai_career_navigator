const scored = (points, explanation, language) => ({
  status: 'scored', source: 'rule_based', points, explanation: explanation[Number(language === 'zh-CN')],
});
const unavailable = (reason) => ({ status: 'unavailable', source: 'rule_based', points: null, reason });
const skipped = (reason) => ({ status: 'not_applicable', source: 'rule_based', points: null, reason });

const datePatterns = [
  /^\d{4}$/u,
  /^\d{4}[-/]\d{1,2}$/u,
  /^\d{4}年(?:\d{1,2}月)?$/u,
  /^[A-Za-z]{3,9}\.?\s+\d{4}$/u,
];

export function cvChecks(resume, evidence, settings) {
  const { language } = settings;
  const document = Boolean(resume.file_media_type);
  const knownSections = [...evidence.sections].filter((name) => name !== 'personal_information' && name !== 'other').length;
  const dates = document ? [] : Object.values(resume.sections).flat().map(({ dates }) => dates).filter(Boolean);
  const styles = dates.flatMap((date) => date.split(/\s+(?:[-–—]|to|至)\s+|[–—]|至/iu))
    .filter((date) => !/^(?:present|current|至今|今)$/iu.test(date.trim()))
    .map((date) => datePatterns.findIndex((pattern) => pattern.test(date.trim())));
  const datesScore = styles.length < 2 || styles.includes(-1) ? unavailable('date_format_not_verified')
    : scored(new Set(styles).size === 1 ? 15 : 7,
      ['Compared the formats of recognized structured dates.', '已比较可识别的结构化日期格式。'], language);

  return {
    text_extractability: document
      ? scored(25, ['The accepted file yielded a text layer within the extraction limits.', '文件在提取限制内提供了可读取的文本层。'], language)
      : skipped('structured_resume_has_no_file'),
    section_identification: scored(Math.min(20, knownSections * 10),
      ['Two recognized content sections earn full credit. Optional sections are evaluated only when present.',
        '识别到两个内容章节即可获得满分。可选章节仅在存在时评估。'], language),
    reading_order: resume.layout
      ? scored(resume.layout.tables || resume.layout.text_boxes || resume.layout.multi_column_sections ? 8 : 20,
        ['DOCX main-body markup was checked for tables, text boxes and multiple columns as reading-order risk indicators.',
          '已检查 DOCX 正文中可能影响阅读顺序的表格、文本框和多栏布局。'], language)
      : document ? unavailable('visual_reading_order_not_verified') : skipped('structured_resume_has_no_file'),
    contact_detection: scored(evidence.hasContact ? 15 : 0,
      ['Checked for a detectable email address or phone number.', '已检查是否可识别电子邮箱或电话号码。'], language),
    graphic_compatibility: resume.layout
      ? scored(resume.layout.graphics || resume.layout.text_boxes ? 5 : 10,
        ['DOCX main-body markup was checked for drawings, objects and text boxes.',
          '已检查 DOCX 正文中的图形、对象和文本框。'], language)
      : document ? unavailable('graphic_layout_not_verified') : skipped('structured_resume_has_no_file'),
    document_format: document
      ? scored(10, ['The file passed the existing PDF or DOCX format validation.', '文件已通过现有 PDF 或 DOCX 格式验证。'], language)
      : skipped('structured_resume_has_no_file'),
    section_organization: scored(Math.min(25, knownSections * 12.5),
      ['Recognized section labels provide navigation. Two labeled content sections earn full credit.',
        '可识别的章节标题有助于导航。两个带标题的内容章节即可获得满分。'], language),
    visual_consistency: document ? unavailable('visual_consistency_not_verified') : skipped('structured_resume_has_no_file'),
    date_formatting: datesScore,
    appropriate_length: document ? unavailable('document_length_not_verified') : skipped('structured_resume_has_no_file'),
    market_conventions: settings.target_country ? unavailable('market_conventions_not_verified') : skipped('target_country_not_selected'),
  };
}
