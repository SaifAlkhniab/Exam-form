/**
 * Smart Arabic Exam Parser & Auto-Paginator
 * Converts raw exam text into structured, auto-paginated exam data.
 */

export function parseExamText(rawText) {
  if (!rawText || !rawText.trim()) {
    return null;
  }

  const text = rawText.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  const result = {
    school: 'المدرسة: فخر المخدرات',
    subject: 'علوم قرآن',
    stage: 'الرابعة',
    semester: 'الفصل: الأول',
    termTitle: 'امتحانات الفصل الأول',
    year: '1448 هـ',
    centerHeader: [
      'العتبة العباسية المقدسة',
      'شعبة مدارس الكفيل الدينية النسوية',
      'الامتحانات الفصلية',
      'لعام 1448 هـ'
    ],
    notice: '',
    teacher: '',
    fontFamily: 'Amiri',
    fontSize: '16.5',
    lineHeight: '1.55',
    headerBoxStyle: 'rectangle', // 'rectangle', 'rounded', 'borderless'
    pageBorderStyle: 'single', // 'single', 'double', 'none'
    titleStyle: 'plain', // 'plain', 'framed'
    questions: []
  };

  // 1. Extract metadata
  // Subject
  const subjectMatch = text.match(/(?:المادة)\s*[:\-\/]\s*([^\n\r]+)/);
  if (subjectMatch) result.subject = subjectMatch[1].trim();

  // Stage
  const stageMatch = text.match(/(?:المرحلة)\s*[:\-\/]\s*([^\n\r]+)/);
  if (stageMatch) result.stage = stageMatch[1].trim();

  // Semester / Round
  const roundMatch = text.match(/(?:للدور|الدور|الفصل|أسئلة\s+امتحان)\s*[:\-\/]\s*([^\n\r]+)/);
  if (roundMatch) {
    const val = roundMatch[1].trim();
    result.semester = val.startsWith('الدور') || val.startsWith('الفصل') ? val : `الفصل: ${val}`;
  }

  // Term Title Banner
  const titleMatch = text.match(/(?:^|\n)\s*(أسئلة\s+امتحان\s*[:\-\/]?\s*([^\n\r]+)|أسئلة\s+([^\n\r/:]+)|امتحانات\s+([^\n\r/:]+))/);
  if (titleMatch) {
    let tVal = (titleMatch[2] || titleMatch[3] || titleMatch[4] || '').trim();
    if (tVal.startsWith('الفصل') || tVal.startsWith('الدور')) {
      result.termTitle = `امتحانات ${tVal}`;
    } else if (tVal) {
      result.termTitle = tVal.startsWith('امتحانات') ? tVal : `امتحانات ${tVal}`;
    }
  }

  // School name if present
  const schoolMatch = text.match(/(?:المدرسة|مدرسة)\s*[:\-\/]\s*([^\n\r]+)/);
  if (schoolMatch) {
    const sName = schoolMatch[1].trim();
    result.school = sName.startsWith('المدرسة') || sName.startsWith('مدرسة') ? sName : `المدرسة: ${sName}`;
  }

  // Notice / Scope (Matches "المادة الداخلة في الامتحان" or "المادة الداخلة بالامتحان" or "تحديد المادة...")
  const noticeMatch = text.match(/(?:^|\n)\s*((?:تحديد\s+)?المادة\s+الداخلة\s*(?:في|بـ?|بالـ?)?الامتحان\s*[:\-\/]?\s*[^\n\r]+|ملاحظة\s*:[^\n\r]+)/);
  if (noticeMatch) result.notice = noticeMatch[1].trim();

  // Teacher name
  const teacherMatch = text.match(/(?:أستاذة?|المعلمة?|المدرس)\s*المادة\s*[:\-\/]\s*([^\n\r]+)/);
  if (teacherMatch) {
    result.teacher = teacherMatch[1].trim().replace(/[.\s]+$/, '');
  }

  // 2. Extract Questions
  const questionHeaderPattern = /(?:^|\n)\s*(س\s*[\d\u0660-\u0669]+[\/:\-\s]*|السؤال\s+[\u0621-\u064A\d\u0660-\u0669]+[\/:\-\s]*)/g;
  const questionMatches = [...text.matchAll(questionHeaderPattern)];

  if (questionMatches.length > 0) {
    const rawQuestions = [];

    for (let i = 0; i < questionMatches.length; i++) {
      const currentMatch = questionMatches[i];
      const startIndex = currentMatch.index + currentMatch[0].length;
      const endIndex = (i + 1 < questionMatches.length) ? questionMatches[i + 1].index : text.length;

      let qNum = currentMatch[1].trim().replace(/[\/:\-\s]+$/, '').trim();
      let qBody = text.substring(startIndex, endIndex).trim();

      // If last question, remove teacher name from the end
      if (i === questionMatches.length - 1 && result.teacher) {
        qBody = qBody.replace(new RegExp(`(?:أستاذة?|المعلمة?|المدرس)\\s*المادة\\s*[:\\-\\/]?\\s*${result.teacher}[.\\s]*`, 'g'), '').trim();
      }

      // Extract marks e.g. (٢٠ د), (١٥ د), (١٠ د), (د١٠)
      let marks = '';
      const marksMatch = qBody.match(/\(([\d\u0660-\u0669]+\s*(?:د|درجة|درجات)|(?:د|درجة|درجات)\s*[\d\u0660-\u0669]+)\)/);
      if (marksMatch) {
        marks = marksMatch[0];
        qBody = qBody.replace(marksMatch[0], '').trim();
      }

      // Check for top-level letter branches (أ /, ب/, ج/ or أ:, ب:, ج:)
      const branchPattern = /(?:^|\n)\s*([أ-ي])\s*[\/:]\s*/g;
      const branchMatches = [...qBody.matchAll(branchPattern)];

      const branches = [];
      let mainText = qBody;

      if (branchMatches.length > 0) {
        mainText = qBody.substring(0, branchMatches[0].index).trim();
        for (let b = 0; b < branchMatches.length; b++) {
          const bMatch = branchMatches[b];
          const bStart = bMatch.index + bMatch[0].length;
          const bEnd = (b + 1 < branchMatches.length) ? branchMatches[b + 1].index : qBody.length;
          const bLabel = bMatch[1].trim();
          let bContent = qBody.substring(bStart, bEnd).trim();

          let bMark = '';
          const bMarkMatch = bContent.match(/\(([\d\u0660-\u0669]+\s*(?:د|درجة|درجات)|(?:د|درجة|درجات)\s*[\d\u0660-\u0669]+)\)/);
          if (bMarkMatch) {
            bMark = bMarkMatch[0];
            bContent = bContent.replace(bMarkMatch[0], '').trim();
          }

          branches.push({
            id: `b_${Date.now()}_${i}_${b}`,
            label: bLabel,
            content: bContent,
            marks: bMark
          });
        }
      } else {
        const numItemPattern = /(?:^|\n)\s*([\d\u0660-\u0669]+[\-.\/]\s*[^\n\r]+)/g;
        const numItems = [...qBody.matchAll(numItemPattern)];
        if (numItems.length > 1) {
          const firstItemIdx = numItems[0].index;
          mainText = qBody.substring(0, firstItemIdx).trim();
          const itemsText = qBody.substring(firstItemIdx).trim();
          branches.push({
            id: `b_${Date.now()}_${i}_0`,
            label: '',
            content: itemsText,
            marks: ''
          });
        }
      }

      rawQuestions.push({
        id: `q_${Date.now()}_${i}`,
        number: qNum || `س${i + 1}`,
        mainText: mainText,
        marks: marks,
        pageBreakBefore: false,
        branches: branches
      });
    }

    // Smart Automatic Pagination Engine
    let currentWeight = 0;
    let isPage1 = true;

    rawQuestions.forEach((q, idx) => {
      let w = 2.0;
      if (q.mainText) {
        w += q.mainText.split('\n').length * 1.0;
      }
      (q.branches || []).forEach(b => {
        w += 1.0;
        const lines = (b.content || '').split('\n');
        lines.forEach(l => {
          w += Math.max(1.0, l.length / 50.0);
        });
      });

      const maxCapacity = isPage1 ? 18.0 : 23.0;

      if (idx > 0 && currentWeight + w > maxCapacity) {
        q.pageBreakBefore = true;
        currentWeight = w;
        isPage1 = false;
      } else {
        currentWeight += w;
      }
    });

    result.questions = rawQuestions;
  }

  return result;
}

export const defaultExamData = {
  school: 'المدرسة: الكفيل النموذجية',
  subject: 'الفقه الإسلامي',
  stage: 'المرحلة الأولى',
  semester: 'الفصل: الأول',
  termTitle: 'امتحانات الفصل الأول',
  year: '1448 هـ',
  centerHeader: [
    'العتبة العباسية المقدسة',
    'شعبة مدارس الكفيل الدينية النسوية',
    'الامتحانات الفصلية',
    'لعام 1448 هـ'
  ],
  notice: 'ملاحظة: الإجابة عن جميع الأسئلة، ولكل سؤال عشرون درجة.',
  teacher: 'لجنة الامتحانات الموقرة',
  fontFamily: 'Amiri',
  fontSize: '16.5',
  lineHeight: '1.55',
  headerBoxStyle: 'rectangle', // 'rectangle', 'rounded', 'borderless', 'modernRibbon'
  pageBorderStyle: 'single', // 'single', 'double', 'none'
  titleStyle: 'plain', // 'plain', 'framed'
  questions: [
    {
      id: 'q_1',
      number: 'س١',
      mainText: 'عرفي أربعة من المصطلحات الفقهية التالية:',
      marks: '(٢٠ د)',
      pageBreakBefore: false,
      branches: [
        {
          id: 'b_1_1',
          label: '',
          content: '١- الحكم الشرعي.\n٢- الواجب التخييري.\n٣- النية في العبادات.\n٤- الماء المطلق.\n٥- الاستحباب.',
          marks: ''
        }
      ]
    },
    {
      id: 'q_2',
      number: 'س٢',
      mainText: 'إملائي الفراغات التالية بما يناسبها من أحكام شرعية:',
      marks: '(٢٠ د)',
      pageBreakBefore: false,
      branches: [
        {
          id: 'b_2_1',
          label: '',
          content: '١- ينقسم الحكم التكليفي إلى خمسة أقسام هي: الواجب، والمستحب، و............، و............، والحرام.\n٢- من شروط صحة الوضوء طهارة أعضاء الوضوء، و............، والترتيب والموالاة.\n٣- الماء المستعمل في رفع الحدث الأصغر يعتبر ماءً ............ ويجوز استعماله في رفع الخبث.\n٤- تجب الصلاة اليومية عند دخول وقتها المحدد شرعاً وعدد ركعاتها في الحضر ............ ركعة.',
          marks: ''
        }
      ]
    },
    {
      id: 'q_3',
      number: 'س٣',
      mainText: 'أجيبي عن الأسئلة الآتية بفرعيها:',
      marks: '(٢٠ د)',
      pageBreakBefore: false,
      branches: [
        {
          id: 'b_3_1',
          label: 'أ',
          content: 'ما الفرق بين الماء القليل والماء الكثير (الكر) من حيث الانفعال بالنجاسة؟',
          marks: '(١٠ د)'
        },
        {
          id: 'b_3_2',
          label: 'ب',
          content: 'عددي مبطلات الوضوء المتفق عليها إجمالاً.',
          marks: '(١٠ د)'
        }
      ]
    },
    {
      id: 'q_4',
      number: 'س٤',
      mainText: 'بيني الحكم الشرعي (يجوز / لا يجوز / يصح / يبطل) مع ذكر السبب باختصار:',
      marks: '(٢٠ د)',
      pageBreakBefore: false,
      branches: [
        {
          id: 'b_4_1',
          label: '',
          content: '١- الوضوء بالماء المغصوب مع جهل المتوضئ بالغصبية.\n٢- المسح على الرأس ببلة جديدة مأخوذة من ماء خارجي مع بقاء بلة اليد.\n٣- الصلاة في الثوب المتنجس بنجاسة معفو عنها في الشرع.\n٤- السجود على ما يصح السجود عليه كالأرض وترابها ونباتها غير المأكول.',
          marks: ''
        }
      ]
    }
  ]
};
