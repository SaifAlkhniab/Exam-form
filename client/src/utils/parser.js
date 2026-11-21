/**
 * Smart Arabic Exam Parser
 * Converts raw exam text (from WhatsApp, Telegram, Word, etc.) into structured exam data.
 */

export function parseExamText(rawText) {
  if (!rawText || !rawText.trim()) {
    return null;
  }

  const text = rawText.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  const result = {
    school: 'المدرسة: فخر المخدرات',
    subject: 'عقائد',
    stage: 'تمهيدي',
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
  const roundMatch = text.match(/(?:للدور|الدور|الفصل)\s*[:\-\/]\s*([^\n\r]+)/);
  if (roundMatch) {
    const val = roundMatch[1].trim();
    result.semester = val.startsWith('الدور') || val.startsWith('الفصل') ? val : `الفصل: ${val}`;
  }

  // Term Title Banner (Strict single line, avoid eating question text)
  const titleMatch = text.match(/(?:^|\n)\s*(أسئلة\s+[^\n\r/:]+|امتحانات\s+[^\n\r/:]+)/);
  if (titleMatch) {
    let rawTitle = titleMatch[1].trim();
    if (rawTitle.startsWith('أسئلة')) {
      rawTitle = rawTitle.replace('أسئلة', 'امتحانات');
    }
    result.termTitle = rawTitle;
  }

  // School name if present
  const schoolMatch = text.match(/(?:المدرسة|مدرسة)\s*[:\-\/]\s*([^\n\r]+)/);
  if (schoolMatch) {
    const sName = schoolMatch[1].trim();
    result.school = sName.startsWith('المدرسة') || sName.startsWith('مدرسة') ? sName : `المدرسة: ${sName}`;
  }

  // Notice / Scope (تحديد المادة الداخلة...)
  const noticeMatch = text.match(/(?:^|\n)\s*(تحديد المادة الداخلة[^\n\r]+|ملاحظة\s*:[^\n\r]+)/);
  if (noticeMatch) result.notice = noticeMatch[1].trim();

  // Teacher name
  const teacherMatch = text.match(/(?:أستاذة?|المعلمة?|المدرس)\s*المادة\s*[:\-\/]\s*([^\n\r]+)/);
  if (teacherMatch) {
    result.teacher = teacherMatch[1].trim().replace(/[.\s]+$/, '');
  }

  // 2. Extract Questions
  // Question Header Pattern: س١/, س 1, س1:, السؤال الأول, etc.
  const questionHeaderPattern = /(?:^|\n)\s*(س\s*[\d\u0660-\u0669]+[\/:\-\s]*|السؤال\s+[\u0621-\u064A\d\u0660-\u0669]+[\/:\-\s]*)/g;
  const questionMatches = [...text.matchAll(questionHeaderPattern)];

  if (questionMatches.length > 0) {
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

      // Extract overall marks e.g. (٢٠ د), (١٠ د), (د١٠)
      let marks = '';
      const marksMatch = qBody.match(/\(([\d\u0660-\u0669]+\s*(?:د|درجة|درجات)|(?:د|درجة|درجات)\s*[\d\u0660-\u0669]+)\)/);
      if (marksMatch) {
        marks = marksMatch[0];
        qBody = qBody.replace(marksMatch[0], '').trim();
      }

      // Check for letter sub-branches: أ/, ب/, ج/ or أ -, ب - or أ:
      const branchPattern = /(?:^|\n)\s*([أ-ي])\s*[\/:\-]\s*/g;
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

          // Check if this branch has its own mark
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
        // If no letter branches, check if it's a list of numbered items (1-, 2-, ...)
        // Keep main guidance clean and separate numbered points
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

      result.questions.push({
        id: `q_${Date.now()}_${i}`,
        number: qNum || `س${i + 1}`,
        mainText: mainText,
        marks: marks,
        pageBreakBefore: i === 4, // Intelligently place page break before Q5 if needed
        branches: branches
      });
    }
  }

  return result;
}

export const defaultExamData = {
  school: 'المدرسة: فخر المخدرات',
  subject: 'عقائد',
  stage: 'تمهيدي',
  semester: 'الفصل: الأول',
  termTitle: 'امتحانات الفصل الأول',
  year: '1448 هـ',
  centerHeader: [
    'العتبة العباسية المقدسة',
    'شعبة مدارس الكفيل الدينية النسوية',
    'الامتحانات الفصلية',
    'لعام 1448 هـ'
  ],
  notice: 'تحديد المادة الداخلة في الامتحان من بداية الكتاب إلى د١١غير داخل',
  teacher: 'انتظار شعلان عبد الرزاق',
  fontFamily: 'Amiri',
  fontSize: '17', // in px
  lineHeight: '1.6',
  questions: [
    {
      id: 'q_1',
      number: 'س١',
      mainText: '',
      marks: '',
      pageBreakBefore: false,
      branches: [
        {
          id: 'b_1_1',
          label: 'أ',
          content: 'عرفي خمسة مما يأتي:\n١- الصفات السلبية   ٢- الصفات الثبوتية الذاتية.   ٣- فروع الدين.   ٤- العدل\n٥- أصول الدين   ٦- الصفات الفعلية.   ٧- التوحيد في العبادة.',
          marks: ''
        },
        {
          id: 'b_1_2',
          label: 'ب',
          content: 'عدد كلا من أصول الدين وفروع الدين، وبيني ما هو الفرق بينهما؟',
          marks: '(١٠ د)'
        }
      ]
    },
    {
      id: 'q_2',
      number: 'س٢',
      mainText: '',
      marks: '(٢٠ د)',
      pageBreakBefore: false,
      branches: [
        {
          id: 'b_2_1',
          label: 'أ',
          content: 'هل تمتلكين دليلاً عقلياً على ان التقليد والظن مذموم عقلاً ؟',
          marks: ''
        },
        {
          id: 'b_2_2',
          label: 'ب',
          content: 'كيف تستدلين بأن الله تعالى واحد لا شريك له؟',
          marks: '(٢٠ د)'
        }
      ]
    },
    {
      id: 'q_3',
      number: 'س٣',
      mainText: 'اجيبي عن الفرعين فقط مما يأتي.',
      marks: '(٢٠ د)',
      pageBreakBefore: false,
      branches: [
        {
          id: 'b_3_1',
          label: 'أ',
          content: 'اذكري اربع من الصفات السلبية؟ مع شرح واحدة منها.',
          marks: ''
        },
        {
          id: 'b_3_2',
          label: 'ب',
          content: 'اذكري دليلاً عقلياً على استحالة الرؤية البصرية لله تعالى؟',
          marks: ''
        },
        {
          id: 'b_3_3',
          label: 'ج',
          content: 'إلى ماذا يشر قوله تعالى : (وما كنا معذبين حتى نبعث رسولاً)',
          marks: '(٢٠ د)'
        }
      ]
    },
    {
      id: 'q_4',
      number: 'س٤',
      mainText: 'اعطي دليل نقلي لخمسة مما يلي :',
      marks: '(٢٠ د)',
      pageBreakBefore: false,
      branches: [
        {
          id: 'b_4_1',
          label: '',
          content: '١- افعال الله تعالى كلها حكمة\n٢- وحدانية الله تعالى.\n٣- الشرك ذنباً لا يغفره.\n٤- انكار لله تعالى على تارك النظر خلق الله تعالى.\n٥- ادعت بعض الديانات في عزير وعيسى عليهم السلام انهم أبناء لله عزوجل.\n٦- ذم الله تعالى من يتبع ظنونه',
          marks: '(٢٠ د)'
        }
      ]
    },
    {
      id: 'q_5',
      number: 'س٥',
      mainText: 'عددي بنقطتين مما يلي.؟',
      marks: '(٢٠ د)',
      pageBreakBefore: true, // Starts Page 2 cleanly
      branches: [
        {
          id: 'b_5_1',
          label: '',
          content: '١- مراتب التوحيد وبيني اثنين منها\n٢- هناك اربع صور تفسر حالة من يصدر عنه ظلم اذكريها؟\n٣- اذكري خمس أدلة لبطلان الجبر.',
          marks: '(٢٠ د)'
        }
      ]
    },
    {
      id: 'q_6',
      number: 'س٦',
      mainText: 'املي الفراغات التالية.',
      marks: '(١٠ د)',
      pageBreakBefore: false,
      branches: [
        {
          id: 'b_6_1',
          label: '',
          content: '١- من مظاهر العدل الالهي ان الله جعل الإنسان .......، وإنقسم المسلمون إلى فرق أبرزها........\n٢- ان الله تعالى قد كلف عباده بافعال الفرائض والواجبات والامتناع عن النواهي والمحرمات ولازم هذا التكليف.................. للقيام بما كلف به؛ حتى...........\n٣- أن طرق معرفة الله عديدة ومتنوعة منها.......... امام عامة الناس و منها............ .\n٤- الله تعالى استثى حالات معينة لا يحاسب عليها الإنسان منها........... او.........\n٥- ان حصول المعرفة بالشيء أما إن تكون........... أو.........\n٦- يتحقق الكمال المطلق لله تعالى بي ....... و..........',
          marks: '(١٠ د)'
        }
      ]
    }
  ]
};
