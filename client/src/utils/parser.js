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
  notice: 'المادة الداخلة بالامتحان : من بداية الكتاب إلى الدرس ٩ غير داخل',
  teacher: 'انتظار شعلان عبد الرزاق',
  fontFamily: 'Amiri',
  fontSize: '16.5',
  lineHeight: '1.55',
  headerBoxStyle: 'rectangle', // 'rectangle', 'rounded', 'borderless'
  pageBorderStyle: 'single', // 'single', 'double', 'none'
  titleStyle: 'plain', // 'plain', 'framed'
  questions: [
    {
      id: 'q_1',
      number: 'س١',
      mainText: 'عرفي خمسة ما يلي :',
      marks: '( ١٥د)',
      pageBreakBefore: false,
      branches: [
        {
          id: 'b_1_1',
          label: '',
          content: '١-  القرأن اصطلاحاً.   ٢- الشريعة.   ٣- العلوم الإنسانية.\n٤- إصطلاح طبيعة الاشياء   ٥- الأخلاق.   ٦- علوم القرآن.',
          marks: ''
        }
      ]
    },
    {
      id: 'q_2',
      number: 'س٢',
      mainText: 'إملائي الفراغات التالية . (ترك فراغ واحد فقط)',
      marks: '(١٥ د)',
      pageBreakBefore: false,
      branches: [
        {
          id: 'b_2_1',
          label: '',
          content: '١- قد اصبح اسم القران الكريم علما له فلا يطلق على..........  وقد ورد هذا الاسم في ....... آية قرآنية.\n٢- يعتبر القرآن الكريم اول الادلة التي يعتمدها الفقهاء في اسطنباط الحكم الشرعي ثم تاتي بعدها............ و......... و.........\n٣- الأخلاق هي الصفات والملكات الراسخه في النفس او هي.............. وقد تطلق على العمل و................\n٤- القرآن كلمة عربية اصيلة، وهي مصدر على وزن........... وتاتي بمعنى.............. و............\n٥- ان الروايات التي جاءت تتحدث عن جمع القران في عهد الخلفاء ليست............ ولا على .............. ولذلك يكون القول الراجح هو..........\n٦- كانت نسخ القران تسمى بأسماء كتابها مثل نسخة مصحف........وقد انتشرت بالكوفة نسخة تسمى  ومصحف.......... وقد انتشرت في بلاد الشام ومصحف.......... وقد في مدينة دمشق.',
          marks: ''
        }
      ]
    },
    {
      id: 'q_3',
      number: 'س٣',
      mainText: 'ماهو مراد المصنف لاثنين مما يلي؟',
      marks: '(٢٠ د)',
      pageBreakBefore: false,
      branches: [
        {
          id: 'b_3_1',
          label: 'أ',
          content: 'في اي زمان دون القرآن الكريم مع الدليل على ذلك؟',
          marks: ''
        },
        {
          id: 'b_3_2',
          label: 'ب',
          content: 'علاقة البسملة بالسور القرآنية؟',
          marks: ''
        },
        {
          id: 'b_3_3',
          label: 'ج',
          content: 'إصطلاح جمع القرآن الكريم وتدونيه له معاني  عدة عدديها، واي هذه المعاني هو المعنى المطلوب ؟',
          marks: ''
        }
      ]
    },
    {
      id: 'q_4',
      number: 'س٤',
      mainText: 'اجيبي عن الفرعين فقط مماياتي.',
      marks: '(٢٠د)',
      pageBreakBefore: true,
      branches: [
        {
          id: 'b_4_1',
          label: 'أ',
          content: 'بيني أهداف القرآن الكريم من خلال القرآن نفسه',
          marks: ''
        },
        {
          id: 'b_4_2',
          label: 'ب',
          content: 'بيني ما  المراد من المصاحف وكذلك ما المراد من توحيد المصاحف؟',
          marks: ''
        },
        {
          id: 'b_4_3',
          label: 'ج',
          content: 'استعمل القرآن الكريم كلمة  الآية عدة استعمالات، اذكريها؟',
          marks: ''
        }
      ]
    },
    {
      id: 'q_5',
      number: 'س٥',
      mainText: 'صححي الخطأ في العبارات التالية وتركي الصحيح أن وجد. الإجابة عن خمس نقاط فقط.',
      marks: '(١٥ د)',
      pageBreakBefore: false,
      branches: [
        {
          id: 'b_5_1',
          label: '',
          content: '١- افتتحت بعض الصور القرانيه بحروف واضحه المعنى سماها المفسرون بفواتح السور\n٢- وقع اختلاف كبير في تحديد معاني فواتح الصور ولكن القول الراجح بالدليل هو. انها اسماء لسواريها ولذلك يقال سورة( حم) وسورة (ق) وهكذا\n٣- ان توحيد المصاحف يعني جعل القران الكريم ما بين دفتين يبدا بسورة الفاتحة وينتهي بسورة الناس.\n٤- مفرده النزول تعني العلو  وبذلك تعني انها العلواً  المكانياً اي نزل من السماء الى الارض.\n٥- ينقسم نزول القران الى قسمين نزولا دفعي جمله واحدة ونزولا تدريجي وكلا النزولين كان المخاطب به هو الرسول صلى الله عليه واله وسلم.\n٦- ان من اهم نقاط قوة القران الكريم والتي اعطتة مكانتة العظيمة هي دوام الحاجة اليه وذلك لحيويته وصلاحيته لكل زمان ومكان.',
          marks: ''
        }
      ]
    },
    {
      id: 'q_6',
      number: 'س٦',
      mainText: '',
      marks: '',
      pageBreakBefore: true,
      branches: [
        {
          id: 'b_6_1',
          label: 'أ',
          content: 'اختاري مابين الأقواس. الإجابة على خمس نقاط فقط.\n١- اقدم محاولة في الكتابة والتدوين في علوم القرآن في:\n   أ- القرن الأول الهجري   ب- القرن السابع   ج- زمن الشيخ المحدث الكليني.\n٢- من اهم كتب علوم القران كان (البرهان في علوم القرآن) للكاتب:\n   أ- الشريف الرضي   ب- علي ابن شهر آشوب   ج- بدر الدين الزركشي\n٣- السر في اختيار اللغة العربية للقرآن الكريم هو:\n   أ- تابعاً للبيئة والمجتمع   ب- قدرة اللغة العربية العالية للاستيعاب   ج- كلاهما معاً.\n٤- عدد المصاحف المنتشرة في بلاد المسلمين بلغت:\n   أ- خمس مصاحف   ب- سبع مصاحف   ج- عشرة مصاحف\n٥- معنى السورة القرآنية هو:\n   أ- مأخوذة من الصورة   ب- مأخوذة من السور   ج- كلاهما خطأ\n٦- احد أسباب تسمية السور القرآنية:\n   أ- توقيفية   ب- مقتبس من المواضيع والأحداث   ج- كلاهما صحيح',
          marks: '(٥ د)'
        },
        {
          id: 'b_6_2',
          label: 'ب',
          content: 'تحدثي عن احد الموضوعين بشكل مفصل كماهو موجود في الكتاب مع بيان مدى مرجعيتها للقران الكريم:\n١- علم التاريخ الإسلامي.\n٢- العلوم الطبيعية التجريبية.',
          marks: '(١٠د)'
        }
      ]
    }
  ]
};
