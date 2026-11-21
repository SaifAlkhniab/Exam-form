/**
 * Smart Arabic Exam Parser
 * Converts raw WhatsApp text into structured exam data.
 */

export function parseWhatsAppExamText(rawText) {
  if (!rawText || !rawText.trim()) {
    return null;
  }

  const text = rawText.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);

  const result = {
    school: 'مدرسة: فخر المخدرات',
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

  // 1. Extract metadata using regex patterns
  // Subject
  const subjectMatch = text.match(/المادة\s*[:\-\/]\s*([^\n]+)/);
  if (subjectMatch) result.subject = subjectMatch[1].trim();

  // Stage
  const stageMatch = text.match(/المرحلة\s*[:\-\/]\s*([^\n]+)/);
  if (stageMatch) result.stage = stageMatch[1].trim();

  // Term / Round / Semester
  const roundMatch = text.match(/(?:للدور|الدور|الفصل)\s*[:\-\/]\s*([^\n]+)/);
  if (roundMatch) {
    const val = roundMatch[1].trim();
    result.semester = val.startsWith('الدور') || val.startsWith('الفصل') ? val : `الفصل: ${val}`;
  }

  // Term title banner (e.g. أسئلة الفصل الأول -> امتحانات الفصل الأول)
  const titleMatch = text.match(/(?:أسئلة|امتحانات)\s+([^\n]+)/);
  if (titleMatch) {
    const rawTitle = titleMatch[0].trim();
    result.termTitle = rawTitle.startsWith('امتحانات') ? rawTitle : rawTitle.replace('أسئلة', 'امتحانات');
  }

  // School name if mentioned
  const schoolMatch = text.match(/(?:المدرسة|مدرسة)\s*[:\-\/]\s*([^\n]+)/);
  if (schoolMatch) result.school = schoolMatch[1].trim();

  // Notice / Scope (e.g. تحديد المادة الداخلة...)
  const noticeMatch = text.match(/(تحديد المادة الداخلة[^\n]+|ملاحظة\s*:[^\n]+)/);
  if (noticeMatch) result.notice = noticeMatch[1].trim();

  // Teacher name
  const teacherMatch = text.match(/(?:أستاذة?|المعلمة?|المدرس)\s*المادة\s*[:\-\/]\s*([^\n]+)/);
  if (teacherMatch) {
    result.teacher = teacherMatch[1].trim().replace(/[.\s]+$/, '');
  }

  // 2. Extract Questions
  // Question headers usually start with: س١, س 1, س1/, السؤال الأول, etc.
  const questionHeaderPattern = /(?:^|\n)\s*(س\s*[\d\u0660-\u0669]+[\/:\-\s]*|السؤال\s+[\u0621-\u064A\d\u0660-\u0669]+[\/:\-\s]*)/g;
  
  const questionMatches = [...text.matchAll(questionHeaderPattern)];

  if (questionMatches.length > 0) {
    for (let i = 0; i < questionMatches.length; i++) {
      const currentMatch = questionMatches[i];
      const startIndex = currentMatch.index + currentMatch[0].length;
      const endIndex = (i + 1 < questionMatches.length) ? questionMatches[i + 1].index : text.length;

      let qNumRaw = currentMatch[1].trim();
      // Clean question prefix: e.g. "س١/" -> "س١"
      let qNum = qNumRaw.replace(/[\/:\-\s]+$/, '').trim();

      let qBody = text.substring(startIndex, endIndex).trim();

      // If this is the last question, strip teacher name if present at the end
      if (i === questionMatches.length - 1 && result.teacher) {
        qBody = qBody.replace(new RegExp(`(?:أستاذة?|المعلمة?|المدرس)\\s*المادة\\s*[:\\-\\/]?\\s*${result.teacher}[.\\s]*`, 'g'), '').trim();
      }

      // Check for marks in the question body, e.g. (٢٠ د), (١٠ د), (د١٠), (20 درجة)
      let marks = '';
      const marksMatch = qBody.match(/\(([\d\u0660-\u0669]+\s*(?:د|درجة|درجات)|(?:د|درجة|درجات)\s*[\d\u0660-\u0669]+)\)/);
      if (marksMatch) {
        marks = marksMatch[0];
        // Remove mark from question body to display it neatly in the dedicated mark badge
        qBody = qBody.replace(marksMatch[0], '').trim();
      }

      // Detect sub-branches (e.g. أ /, ب /, ج / or أ -, ب -)
      const branchPattern = /(?:^|\n)\s*([أ-ي])\s*[\/:\-]\s*/g;
      const branchMatches = [...qBody.matchAll(branchPattern)];

      const branches = [];
      if (branchMatches.length > 0) {
        for (let b = 0; b < branchMatches.length; b++) {
          const bMatch = branchMatches[b];
          const bStart = bMatch.index + bMatch[0].length;
          const bEnd = (b + 1 < branchMatches.length) ? branchMatches[b + 1].index : qBody.length;
          const bLabel = bMatch[1].trim();
          let bContent = qBody.substring(bStart, bEnd).trim();

          // Check if branch has its own mark
          let bMark = '';
          const bMarkMatch = bContent.match(/\(([\d\u0660-\u0669]+\s*(?:د|درجة|درجات)|(?:د|درجة|درجات)\s*[\d\u0660-\u0669]+)\)/);
          if (bMarkMatch) {
            bMark = bMarkMatch[0];
            bContent = bContent.replace(bMarkMatch[0], '').trim();
          }

          branches.push({
            id: `b_${Date.now()}_${b}`,
            label: bLabel,
            content: bContent,
            marks: bMark
          });
        }
      }

      result.questions.push({
        id: `q_${Date.now()}_${i}`,
        number: qNum || `س${i + 1}`,
        mainText: branchMatches.length > 0 ? qBody.substring(0, branchMatches[0].index).trim() : qBody,
        marks: marks,
        branches: branches
      });
    }
  }

  return result;
}

/**
 * Default sample data loaded upon startup
 */
export const defaultExamData = {
  school: 'مدرسة: فخر المخدرات',
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
  notice: 'المادة الداخلة في الامتحان من بداية الكتاب إلى د١١غير داخل',
  teacher: 'انتظار شعلان عبد الرزاق',
  questions: [
    {
      id: 'q_1',
      number: 'س١',
      mainText: 'أ : عرفي خمسة مما يأتي.',
      marks: '(١٠ د)',
      branches: [
        {
          id: 'b_1_1',
          label: 'أ',
          content: 'عرفي خمسة مما يأتي:\n١- الصفات السلبية  ٢- الصفات الثبوتية الذاتية.  ٣- فروع الدين.  ٤- العدل\n٥- أصول الدين  ٦- الصفات الفعلية.  ٧- التوحيد في العبادة.',
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
