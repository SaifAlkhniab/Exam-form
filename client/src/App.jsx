import React, { useState, useMemo, useEffect, useRef } from 'react';
import styles from './App.module.css';
import { defaultExamData, parseExamText } from './utils/parser';
import { exportToDocx } from './utils/docxExporter';
import {
  FileText,
  Eye,
  Download,
  Plus,
  Trash2,
  MoveUp,
  MoveDown,
  ClipboardPaste,
  Edit3,
  CheckCircle2,
  Printer,
  Sparkles,
  School,
  Type,
  Layers,
  ChevronDown,
  ChevronUp,
  Settings,
  Share2
} from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState('editor'); // 'editor', 'smartPaste', 'settings', 'preview'
  const [examData, setExamData] = useState(defaultExamData);
  const [rawText, setRawText] = useState('');
  const [toastMessage, setToastMessage] = useState('');
  const [expandedQuestions, setExpandedQuestions] = useState({});
  const [isMobile, setIsMobile] = useState(typeof window !== 'undefined' ? window.innerWidth < 768 : false);
  const [windowWidth, setWindowWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1200);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const exportMenuRef = useRef(null);

  useEffect(() => {
    const handleResize = () => {
      const w = window.innerWidth;
      setWindowWidth(w);
      setIsMobile(w < 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Close export menu on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (exportMenuRef.current && !exportMenuRef.current.contains(e.target)) {
        setShowExportMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3500);
  };

  // Toggle accordion question card
  const toggleQuestionExpand = (qId) => {
    setExpandedQuestions(prev => ({
      ...prev,
      [qId]: prev[qId] === false ? true : false
    }));
  };

  // Smart text import
  const handleAutoParse = () => {
    if (!rawText.trim()) {
      alert('يرجى لصق نص الأسئلة أولاً!');
      return;
    }
    const parsed = parseExamText(rawText);
    if (parsed) {
      setExamData(prev => ({
        ...parsed,
        fontFamily: prev.fontFamily,
        fontSize: prev.fontSize,
        lineHeight: prev.lineHeight,
        headerBoxStyle: prev.headerBoxStyle,
        pageBorderStyle: prev.pageBorderStyle,
        titleStyle: prev.titleStyle
      }));
      showToast('تم استيراد وتحليل وتوزيع صفحات الامتحان بنجاح!');
      setActiveTab('preview');
    } else {
      alert('لم نتمكن من تحليل النص، تأكد من وجود نص الأسئلة.');
    }
  };

  // Add question
  const handleAddQuestion = () => {
    const nextNum = `س${examData.questions.length + 1}`;
    const newQ = {
      id: `q_${Date.now()}`,
      number: nextNum,
      mainText: '',
      marks: '',
      pageBreakBefore: false,
      branches: [
        {
          id: `b_${Date.now()}_1`,
          label: 'أ',
          content: '',
          marks: ''
        }
      ]
    };
    setExamData({
      ...examData,
      questions: [...examData.questions, newQ]
    });
  };

  // Delete question
  const handleDeleteQuestion = (qId, e) => {
    if (e) e.stopPropagation();
    setExamData({
      ...examData,
      questions: examData.questions.filter((q) => q.id !== qId)
    });
  };

  // Move question
  const handleMoveQuestion = (index, direction, e) => {
    if (e) e.stopPropagation();
    const newQs = [...examData.questions];
    const targetIdx = index + direction;
    if (targetIdx < 0 || targetIdx >= newQs.length) return;
    const temp = newQs[index];
    newQs[index] = newQs[targetIdx];
    newQs[targetIdx] = temp;
    setExamData({ ...examData, questions: newQs });
  };

  // Update question
  const handleUpdateQuestion = (qId, field, value) => {
    setExamData({
      ...examData,
      questions: examData.questions.map((q) =>
        q.id === qId ? { ...q, [field]: value } : q
      )
    });
  };

  // Toggle page break before question
  const handleTogglePageBreak = (qId, e) => {
    if (e) e.stopPropagation();
    setExamData({
      ...examData,
      questions: examData.questions.map((q) =>
        q.id === qId ? { ...q, pageBreakBefore: !q.pageBreakBefore } : q
      )
    });
  };

  // Add branch
  const handleAddBranch = (qId) => {
    const arabicLetters = ['أ', 'ب', 'ج', 'د', 'هـ', 'و', 'ز', 'ح'];
    setExamData({
      ...examData,
      questions: examData.questions.map((q) => {
        if (q.id === qId) {
          const nextLetter = arabicLetters[q.branches.length] || '';
          return {
            ...q,
            branches: [
              ...q.branches,
              {
                id: `b_${Date.now()}`,
                label: nextLetter,
                content: '',
                marks: ''
              }
            ]
          };
        }
        return q;
      })
    });
  };

  // Delete branch
  const handleDeleteBranch = (qId, branchId) => {
    setExamData({
      ...examData,
      questions: examData.questions.map((q) => {
        if (q.id === qId) {
          return {
            ...q,
            branches: q.branches.filter((b) => b.id !== branchId)
          };
        }
        return q;
      })
    });
  };

  // Update branch
  const handleUpdateBranch = (qId, branchId, field, value) => {
    setExamData({
      ...examData,
      questions: examData.questions.map((q) => {
        if (q.id === qId) {
          return {
            ...q,
            branches: q.branches.map((b) =>
              b.id === branchId ? { ...b, [field]: value } : b
            )
          };
        }
        return q;
      })
    });
  };

  // Multi-page splitting logic
  const pages = useMemo(() => {
    const result = [];
    let currentPage = [];

    examData.questions.forEach((q, idx) => {
      if (q.pageBreakBefore && idx > 0 && currentPage.length > 0) {
        result.push(currentPage);
        currentPage = [q];
      } else {
        currentPage.push(q);
      }
    });

    if (currentPage.length > 0 || result.length === 0) {
      result.push(currentPage);
    }

    return result;
  }, [examData.questions]);

  // Handle PDF Print
  const handlePrint = () => {
    window.print();
  };

  // Export to Word
  const handleExportWord = async () => {
    try {
      showToast('جارٍ إعداد وتصدير ملف Word (.docx)...');
      await exportToDocx(examData);
      showToast('تم تحميل ملف Word بنجاح!');
    } catch (err) {
      console.error(err);
      alert('حدث خطأ أثناء تصدير ملف Word: ' + err.message);
    }
  };

  // Header Box Class based on Settings
  const headerBoxClass = useMemo(() => {
    if (examData.headerBoxStyle === 'rounded') return styles.headerBoxRounded;
    if (examData.headerBoxStyle === 'borderless') return styles.headerBoxBorderless;
    return styles.headerBoxRectangle;
  }, [examData.headerBoxStyle]);

  // Page Border Class based on Settings
  const pageBorderClass = useMemo(() => {
    if (examData.pageBorderStyle === 'double') return styles.borderDouble;
    if (examData.pageBorderStyle === 'none') return styles.borderNone;
    return styles.borderSingle;
  }, [examData.pageBorderStyle]);

  return (
    <div className={styles.appContainer}>
      {/* Top Header */}
      <header className={styles.topNav}>
        <div className={styles.navContent}>
          <div className={styles.brand}>
            <img src="/logo.png" alt="الشعار" className={styles.brandLogo} />
            <div>
              <h1 className={styles.brandTitle}>منظومة إعداد الأسئلة الامتحانية</h1>
              <p className={styles.brandSubtitle}>العتبة العباسية المقدسة - مدارس الكفيل الدينية النسوية</p>
            </div>
          </div>

          {!isMobile && (
            <div className={styles.topActions}>
              <div className={styles.tabBar}>
                <button
                  className={`${styles.tabBtn} ${activeTab === 'editor' ? styles.tabBtnActive : ''}`}
                  onClick={() => setActiveTab('editor')}
                >
                  <Edit3 size={15} />
                  <span>النموذج</span>
                </button>
                <button
                  className={`${styles.tabBtn} ${activeTab === 'smartPaste' ? styles.tabBtnActive : ''}`}
                  onClick={() => setActiveTab('smartPaste')}
                >
                  <ClipboardPaste size={15} />
                  <span>استيراد النص</span>
                </button>
                <button
                  className={`${styles.tabBtn} ${activeTab === 'settings' ? styles.tabBtnActive : ''}`}
                  onClick={() => setActiveTab('settings')}
                >
                  <Settings size={15} />
                  <span>الإعدادات</span>
                </button>
                <button
                  className={`${styles.tabBtn} ${activeTab === 'preview' ? styles.tabBtnActive : ''}`}
                  onClick={() => setActiveTab('preview')}
                >
                  <Eye size={15} />
                  <span>المعاينة ({pages.length} صفحات)</span>
                </button>
              </div>

              {/* UNIFIED EXPORT DROPDOWN */}
              <div className={styles.exportWrapper} ref={exportMenuRef}>
                <button
                  className={`${styles.btn} ${styles.btnPrimary}`}
                  onClick={() => setShowExportMenu(!showExportMenu)}
                >
                  <Share2 size={15} />
                  <span>تصدير ▾</span>
                </button>
                {showExportMenu && (
                  <div className={styles.exportDropdown}>
                    <button
                      className={styles.dropdownItem}
                      onClick={() => {
                        setShowExportMenu(false);
                        handlePrint();
                      }}
                    >
                      <Printer size={16} color="#1b5e20" />
                      <span>تحميل ملف PDF (طباعة جاهزة)</span>
                    </button>
                    <div className={styles.dropdownDivider} />
                    <button
                      className={styles.dropdownItem}
                      onClick={() => {
                        setShowExportMenu(false);
                        handleExportWord();
                      }}
                    >
                      <FileText size={16} color="#0284c7" />
                      <span>تحميل مستند Word (.docx)</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </header>

      {/* Toast Notification */}
      {toastMessage && (
        <div style={{
          position: 'fixed',
          top: 65,
          left: '50%',
          transform: 'translateX(-50%)',
          background: '#1b5e20',
          color: '#ffffff',
          padding: '8px 18px',
          borderRadius: '8px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          fontSize: '0.88rem',
          fontWeight: 600
        }}>
          <CheckCircle2 size={16} />
          {toastMessage}
        </div>
      )}

      {/* Main Workspace */}
      <main className={styles.mainLayout}>
        <div className={(!isMobile && activeTab !== 'preview') ? styles.desktopSplit : styles.singleColumn}>
          
          {/* EDIT & FORM COLUMN (Hidden on mobile if activeTab === 'preview') */}
          {(!isMobile || activeTab !== 'preview') && (
            <div>
              {/* SMART IMPORT TAB */}
              {activeTab === 'smartPaste' && (
                <div className={styles.card}>
                  <div className={styles.cardHeader}>
                    <h2 className={styles.cardTitle}>
                      <Sparkles size={17} />
                      استيراد النص وتحليله تلقائياً
                    </h2>
                  </div>
                  <p style={{ fontSize: '0.84rem', color: '#64748b', marginTop: 0, lineHeight: 1.5 }}>
                    يمكنك لصق نص الأسئلة من أي مصدر (واتساب، تيليجرام، ملف نصي، أو مستند وورد). يقوم النظام بضبط الترويسة واستخراج الأسئلة وتوزيعها تلقائياً على الصفحات لمنع أي فيض.
                  </p>
                  <textarea
                    className={styles.pasteTextarea}
                    placeholder="الصق نص الامتحان هنا..."
                    value={rawText}
                    onChange={(e) => setRawText(e.target.value)}
                  />
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    <button className={`${styles.btn} ${styles.btnPrimary}`} onClick={handleAutoParse}>
                      <Sparkles size={15} />
                      استخراج وتحديث النموذج فوراً
                    </button>
                    <button
                      className={`${styles.btn} ${styles.btnSecondary}`}
                      onClick={() => setRawText('')}
                    >
                      مسح
                    </button>
                  </div>
                </div>
              )}

              {/* SETTINGS TAB */}
              {activeTab === 'settings' && (
                <div className={styles.card}>
                  <div className={styles.cardHeader}>
                    <h2 className={styles.cardTitle}>
                      <Settings size={17} />
                      تخصيص النمط والشكل العام
                    </h2>
                  </div>

                  {/* Header Box Shape */}
                  <div className={styles.settingsSection}>
                    <div className={styles.settingsSectionTitle}>
                      <span>شكل إطار الترويسة العلوية</span>
                    </div>
                    <div className={styles.settingsGrid}>
                      <div
                        className={`${styles.settingOptionCard} ${examData.headerBoxStyle === 'rectangle' ? styles.settingOptionSelected : ''}`}
                        onClick={() => setExamData({ ...examData, headerBoxStyle: 'rectangle' })}
                      >
                        <span className={styles.settingOptionName}>مستطيل حاد الزوايا (الافتراضي)</span>
                        <span className={styles.settingOptionDesc}>النمط الرسمي المعتمد لمدارس الكفيل</span>
                      </div>
                      <div
                        className={`${styles.settingOptionCard} ${examData.headerBoxStyle === 'rounded' ? styles.settingOptionSelected : ''}`}
                        onClick={() => setExamData({ ...examData, headerBoxStyle: 'rounded' })}
                      >
                        <span className={styles.settingOptionName}>مستطيل بزوايا دائرية (Rounded)</span>
                        <span className={styles.settingOptionDesc}>مظهر عصري وناعم لحواف الترويسة</span>
                      </div>
                      <div
                        className={`${styles.settingOptionCard} ${examData.headerBoxStyle === 'borderless' ? styles.settingOptionSelected : ''}`}
                        onClick={() => setExamData({ ...examData, headerBoxStyle: 'borderless' })}
                      >
                        <span className={styles.settingOptionName}>بدون إطار خارجي (Clean)</span>
                        <span className={styles.settingOptionDesc}>فقط خط سفلي فاصل بدون صندوق كامل</span>
                      </div>
                    </div>
                  </div>

                  {/* Page Border Style */}
                  <div className={styles.settingsSection}>
                    <div className={styles.settingsSectionTitle}>
                      <span>نمط إطار الصفحة الخارجي</span>
                    </div>
                    <div className={styles.settingsGrid}>
                      <div
                        className={`${styles.settingOptionCard} ${examData.pageBorderStyle === 'single' ? styles.settingOptionSelected : ''}`}
                        onClick={() => setExamData({ ...examData, pageBorderStyle: 'single' })}
                      >
                        <span className={styles.settingOptionName}>إطار مفرد رسمي (Single)</span>
                        <span className={styles.settingOptionDesc}>خط أسود أنيق ومناسب للطباعة الرسمية</span>
                      </div>
                      <div
                        className={`${styles.settingOptionCard} ${examData.pageBorderStyle === 'double' ? styles.settingOptionSelected : ''}`}
                        onClick={() => setExamData({ ...examData, pageBorderStyle: 'double' })}
                      >
                        <span className={styles.settingOptionName}>إطار مزدوج (Double Border)</span>
                        <span className={styles.settingOptionDesc}>إطار تقليدي كلاسيكي بخطين متوازيين</span>
                      </div>
                      <div
                        className={`${styles.settingOptionCard} ${examData.pageBorderStyle === 'none' ? styles.settingOptionSelected : ''}`}
                        onClick={() => setExamData({ ...examData, pageBorderStyle: 'none' })}
                      >
                        <span className={styles.settingOptionName}>بدون إطار (No Border)</span>
                        <span className={styles.settingOptionDesc}>صفحة نظيفة مع هوامش بيضاء طبيعية</span>
                      </div>
                    </div>
                  </div>

                  {/* Center Title Style */}
                  <div className={styles.settingsSection}>
                    <div className={styles.settingsSectionTitle}>
                      <span>نمط عنوان الامتحان الأوسط</span>
                    </div>
                    <div className={styles.settingsGrid}>
                      <div
                        className={`${styles.settingOptionCard} ${examData.titleStyle === 'plain' ? styles.settingOptionSelected : ''}`}
                        onClick={() => setExamData({ ...examData, titleStyle: 'plain' })}
                      >
                        <span className={styles.settingOptionName}>نص مباشر بدون إطار (المرجع الأصلي)</span>
                        <span className={styles.settingOptionDesc}>نص عريض تحت الشعار مباشرة</span>
                      </div>
                      <div
                        className={`${styles.settingOptionCard} ${examData.titleStyle === 'framed' ? styles.settingOptionSelected : ''}`}
                        onClick={() => setExamData({ ...examData, titleStyle: 'framed' })}
                      >
                        <span className={styles.settingOptionName}>شريط مؤطر (Framed Badge)</span>
                        <span className={styles.settingOptionDesc}>محدد بإطار مستطيل صغير حول العنوان</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* EXAM HEADER CARD */}
              {activeTab === 'editor' && (
                <div className={styles.card}>
                  <div className={styles.cardHeader}>
                    <h2 className={styles.cardTitle}>
                      <School size={17} />
                      بيانات الامتحان والترويسة
                    </h2>
                  </div>
                  <div className={styles.formGrid}>
                    <div className={styles.inputGroup}>
                      <label className={styles.label}>المادة الدراسية</label>
                      <input
                        className={styles.input}
                        value={examData.subject}
                        onChange={(e) => setExamData({ ...examData, subject: e.target.value })}
                      />
                    </div>

                    <div className={styles.inputGroup}>
                      <label className={styles.label}>المرحلة</label>
                      <input
                        className={styles.input}
                        value={examData.stage}
                        onChange={(e) => setExamData({ ...examData, stage: e.target.value })}
                      />
                    </div>

                    <div className={styles.inputGroup}>
                      <label className={styles.label}>الفصل / الدور</label>
                      <input
                        className={styles.input}
                        value={examData.semester}
                        onChange={(e) => setExamData({ ...examData, semester: e.target.value })}
                      />
                    </div>

                    <div className={styles.inputGroup}>
                      <label className={styles.label}>عنوان الوسط (تحت الشعار)</label>
                      <input
                        className={styles.input}
                        value={examData.termTitle}
                        onChange={(e) => setExamData({ ...examData, termTitle: e.target.value })}
                      />
                    </div>

                    <div className={styles.inputGroup}>
                      <label className={styles.label}>اسم المدرسة</label>
                      <input
                        className={styles.input}
                        value={examData.school}
                        onChange={(e) => setExamData({ ...examData, school: e.target.value })}
                      />
                    </div>

                    <div className={styles.inputGroup}>
                      <label className={styles.label}>العام الدراسي</label>
                      <input
                        className={styles.input}
                        value={examData.year}
                        onChange={(e) => setExamData({ ...examData, year: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className={styles.inputGroup} style={{ marginTop: '10px' }}>
                    <label className={styles.label}>المادة الداخلة في الامتحان (الملاحظة العلوية)</label>
                    <input
                      className={styles.input}
                      value={examData.notice}
                      onChange={(e) => setExamData({ ...examData, notice: e.target.value })}
                    />
                  </div>

                  <div className={styles.inputGroup} style={{ marginTop: '10px' }}>
                    <label className={styles.label}>اسم أستاذة / أستاذ المادة (يظهر دائماً أسفل الصفحة الأخيرة)</label>
                    <input
                      className={styles.input}
                      value={examData.teacher}
                      onChange={(e) => setExamData({ ...examData, teacher: e.target.value })}
                    />
                  </div>
                </div>
              )}

              {/* QUESTIONS LIST */}
              {activeTab === 'editor' && (
                <div className={styles.card}>
                  <div className={styles.cardHeader}>
                    <h2 className={styles.cardTitle}>
                      <FileText size={17} />
                      قائمة الأسئلة ({examData.questions.length})
                    </h2>
                    <button className={`${styles.btn} ${styles.btnPrimary}`} onClick={handleAddQuestion}>
                      <Plus size={15} />
                      إضافة سؤال
                    </button>
                  </div>

                  {examData.questions.map((q, idx) => {
                    const isCollapsed = expandedQuestions[q.id] === false;

                    return (
                      <div key={q.id} className={styles.questionCard}>
                        <div
                          className={styles.questionHeaderRow}
                          onClick={() => toggleQuestionExpand(q.id)}
                        >
                          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                            <span style={{ fontWeight: 700, color: '#1b5e20', fontSize: '0.95rem' }}>
                              {q.number || `س${idx + 1}`}
                            </span>
                            <span style={{ fontSize: '0.82rem', color: '#64748b', maxWidth: '180px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {q.mainText || 'بدون نص رئيسي'}
                            </span>
                            {q.marks && (
                              <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#b78103' }}>
                                {q.marks}
                              </span>
                            )}
                          </div>

                          <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                            {idx > 0 && (
                              <button
                                type="button"
                                className={styles.pageBreakBadge}
                                style={{
                                  background: q.pageBreakBefore ? '#1b5e20' : '#f1f5f9',
                                  color: q.pageBreakBefore ? '#ffffff' : '#64748b',
                                  border: q.pageBreakBefore ? '1px solid #144617' : '1px dashed #cbd5e1'
                                }}
                                onClick={(e) => handleTogglePageBreak(q.id, e)}
                                title="بدء صفحة جديدة في الطباعة من هذا السؤال"
                              >
                                <Layers size={13} />
                                <span>{q.pageBreakBefore ? 'صفحة جديدة 📄' : 'نفس الصفحة'}</span>
                              </button>
                            )}

                            <button
                              className={`${styles.btn} ${styles.btnSecondary}`}
                              onClick={(e) => handleMoveQuestion(idx, -1, e)}
                              disabled={idx === 0}
                              title="تحريك لأعلى"
                              style={{ padding: '5px' }}
                            >
                              <MoveUp size={13} />
                            </button>
                            <button
                              className={`${styles.btn} ${styles.btnSecondary}`}
                              onClick={(e) => handleMoveQuestion(idx, 1, e)}
                              disabled={idx === examData.questions.length - 1}
                              title="تحريك لأسفل"
                              style={{ padding: '5px' }}
                            >
                              <MoveDown size={13} />
                            </button>
                            <button
                              className={`${styles.btn} ${styles.btnDanger}`}
                              onClick={(e) => handleDeleteQuestion(q.id, e)}
                              title="حذف"
                              style={{ padding: '5px' }}
                            >
                              <Trash2 size={13} />
                            </button>
                            {isCollapsed ? <ChevronDown size={16} color="#64748b" /> : <ChevronUp size={16} color="#64748b" />}
                          </div>
                        </div>

                        {/* Question Form Body */}
                        {!isCollapsed && (
                          <div className={styles.questionCardBody}>
                            <div style={{ display: 'flex', gap: '8px', marginBottom: '8px', flexWrap: 'wrap' }}>
                              <div className={styles.inputGroup} style={{ flex: '0 0 75px' }}>
                                <label className={styles.label}>رقم السؤال</label>
                                <input
                                  className={`${styles.input} ${styles.questionNumInput}`}
                                  value={q.number}
                                  onChange={(e) => handleUpdateQuestion(q.id, 'number', e.target.value)}
                                />
                              </div>
                              <div className={styles.inputGroup} style={{ flex: '0 0 90px' }}>
                                <label className={styles.label}>الدرجة</label>
                                <input
                                  className={`${styles.input} ${styles.questionMarksInput}`}
                                  value={q.marks}
                                  onChange={(e) => handleUpdateQuestion(q.id, 'marks', e.target.value)}
                                  placeholder="(١٥ د)"
                                />
                              </div>
                              <div className={styles.inputGroup} style={{ flex: 1, minWidth: '160px' }}>
                                <label className={styles.label}>التوجيه / النص الرئيسي</label>
                                <input
                                  className={styles.input}
                                  value={q.mainText}
                                  onChange={(e) => handleUpdateQuestion(q.id, 'mainText', e.target.value)}
                                  placeholder="مثال: عرفي خمسة مما يأتي..."
                                />
                              </div>
                            </div>

                            {/* Sub Branches */}
                            {q.branches && q.branches.length > 0 && (
                              <div style={{ marginTop: '8px' }}>
                                {q.branches.map((b) => (
                                  <div key={b.id} className={styles.branchRow}>
                                    <div className={styles.branchHeader}>
                                      <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                                        <span style={{ fontSize: '0.78rem', color: '#64748b' }}>الفرع:</span>
                                        <input
                                          className={`${styles.input} ${styles.branchLabelInput}`}
                                          value={b.label}
                                          onChange={(e) => handleUpdateBranch(q.id, b.id, 'label', e.target.value)}
                                          placeholder="أ"
                                        />
                                        <input
                                          className={`${styles.input} ${styles.questionMarksInput}`}
                                          value={b.marks}
                                          onChange={(e) => handleUpdateBranch(q.id, b.id, 'marks', e.target.value)}
                                          placeholder="(١٠ د)"
                                        />
                                      </div>
                                      <button
                                        className={`${styles.btn} ${styles.btnDanger}`}
                                        onClick={() => handleDeleteBranch(q.id, b.id)}
                                        title="حذف الفرع"
                                        style={{ padding: '4px 8px' }}
                                      >
                                        <Trash2 size={12} />
                                      </button>
                                    </div>
                                    <textarea
                                      className={styles.textarea}
                                      value={b.content}
                                      onChange={(e) => handleUpdateBranch(q.id, b.id, 'content', e.target.value)}
                                      placeholder="محتوى الفرع، الفراغات، أو النقاط..."
                                      rows={2}
                                    />
                                  </div>
                                ))}
                              </div>
                            )}

                            <div style={{ marginTop: '8px' }}>
                              <button
                                className={`${styles.btn} ${styles.btnSecondary}`}
                                onClick={() => handleAddBranch(q.id)}
                                style={{ fontSize: '0.78rem', padding: '5px 9px' }}
                              >
                                <Plus size={12} /> إضافة فرع (أ / ب / ج)
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}

                  <button className={`${styles.btn} ${styles.btnOutline}`} onClick={handleAddQuestion}>
                    <Plus size={15} /> إضافة سؤال جديد
                  </button>
                </div>
              )}
            </div>
          )}

          {/* PREVIEW COLUMN (Always visible on desktop split, or in preview tab on mobile) */}
          {(!isMobile || activeTab === 'preview') && (
            <div>
              {/* TYPOGRAPHY TOOLBAR */}
              <div className={styles.previewToolbar}>
                <div className={styles.toolbarGroup}>
                  <Type size={15} color="#1b5e20" />
                  <span className={styles.toolbarLabel}>نوع الخط:</span>
                  <select
                    className={styles.select}
                    value={examData.fontFamily}
                    onChange={(e) => setExamData({ ...examData, fontFamily: e.target.value })}
                    style={{ padding: '5px 8px', fontSize: '0.82rem', width: 'auto' }}
                  >
                    <option value="Amiri">الخط الأميري (التقليدي)</option>
                    <option value="Scheherazade New">خط المصاحف (شهربان)</option>
                    <option value="Cairo">خط القاهرة الحديث</option>
                    <option value="Arial">الخط المكتبي (Arial)</option>
                  </select>
                </div>

                {/* STEPPER FOR FONT SIZE (- 16.5px +) */}
                <div className={styles.toolbarGroup}>
                  <span className={styles.toolbarLabel}>حجم الخط:</span>
                  <div className={styles.stepperContainer}>
                    <button
                      type="button"
                      className={styles.stepperBtn}
                      onClick={() => setExamData(prev => ({
                        ...prev,
                        fontSize: String(Math.max(13, (parseFloat(prev.fontSize) - 0.5)).toFixed(1))
                      }))}
                      title="تصغير الخط"
                    >
                      -
                    </button>
                    <span className={styles.stepperValue}>{examData.fontSize}px</span>
                    <button
                      type="button"
                      className={styles.stepperBtn}
                      onClick={() => setExamData(prev => ({
                        ...prev,
                        fontSize: String(Math.min(22, (parseFloat(prev.fontSize) + 0.5)).toFixed(1))
                      }))}
                      title="تكبير الخط"
                    >
                      +
                    </button>
                  </div>
                </div>

                <div className={styles.toolbarGroup}>
                  <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#1b5e20', background: '#e8f5e9', padding: '4px 10px', borderRadius: '6px' }}>
                    {pages.length} صفحات A4
                  </span>
                </div>
              </div>

              {/* A4 PREVIEW CONTAINER */}
              <div className={styles.paperWrapper}>
                <div
                  className={styles.pageContainerMobile}
                  style={{
                    fontFamily: examData.fontFamily || 'Amiri',
                    fontSize: `${examData.fontSize || 16.5}px`,
                    lineHeight: examData.lineHeight || 1.55
                  }}
                >
                  {pages.map((pageQuestions, pageIdx) => {
                    const isFirstPage = pageIdx === 0;
                    const isLastPage = pageIdx === pages.length - 1;

                    return (
                      <div key={pageIdx} className={styles.pageMobileWrapper}>
                        <div className={styles.a4Page}>
                          <div className={pageBorderClass}>
                            
                            {/* EXACT HAWZAH HEADER DESIGN MATCHING IMAGE 2 ON PAGE 1 */}
                            {isFirstPage && (
                              <>
                                <div className={headerBoxClass}>
                                  
                                  {/* 1. RIGHT COLUMN (RTL): AL-ABBAS HOLY SHRINE DETAILS */}
                                  <div className={styles.headerRight}>
                                    {(examData.centerHeader || []).map((line, lIdx) => (
                                      <div key={lIdx}>{line}</div>
                                    ))}
                                  </div>

                                  {/* 2. CENTER COLUMN: OFFICIAL EMBLEM + CLEAN TEXT UNDERNEATH */}
                                  <div className={styles.headerCenter}>
                                    <img src="/logo.png" alt="الشعار" className={styles.centerLogo} />
                                    <div className={examData.titleStyle === 'framed' ? styles.centerTitleFramed : styles.centerTitleText}>
                                      {examData.termTitle || 'امتحانات الفصل الأول'}
                                    </div>
                                  </div>

                                  {/* 3. LEFT COLUMN (RTL): SCHOOL NAME, SUBJECT, STAGE, SEMESTER */}
                                  <div className={styles.headerLeft}>
                                    <div>{examData.school || 'المدرسة: فخر المخدرات'}</div>
                                    <div>المادة: {examData.subject}</div>
                                    <div>المرحلة: {examData.stage}</div>
                                    <div>{examData.semester}</div>
                                  </div>

                                </div>

                                {/* Scope/Notice Banner */}
                                {examData.notice && (
                                  <div className={styles.examNotice}>
                                    {examData.notice}
                                  </div>
                                )}
                              </>
                            )}

                            {/* QUESTIONS FOR THIS PAGE */}
                            <div className={styles.paperQuestions} style={{ paddingTop: isFirstPage ? '0' : '10px' }}>
                              {pageQuestions.map((q) => (
                                <div key={q.id} className={styles.paperQuestionItem}>
                                  <div className={styles.paperQuestionTitle}>
                                    <div>
                                      <span>{q.number}/ </span>
                                      <span>{q.mainText}</span>
                                    </div>
                                    {q.marks && <span className={styles.paperMarks}>{q.marks}</span>}
                                  </div>

                                  {/* Sub branches */}
                                  {q.branches && q.branches.map((b) => (
                                    <div key={b.id} className={styles.paperBranchItem}>
                                      <div>
                                        {b.label && <strong>{b.label}/ </strong>}
                                        <span>{b.content}</span>
                                      </div>
                                      {b.marks && <span className={styles.paperMarks}>{b.marks}</span>}
                                    </div>
                                  ))}
                                </div>
                              ))}
                            </div>

                            {/* TEACHER SIGNATURE (PINNED AT THE BOTTOM OF THE LAST PAGE) */}
                            {isLastPage && examData.teacher && (
                              <div className={styles.paperFooter}>
                                أستاذة المادة : {examData.teacher}
                              </div>
                            )}

                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

        </div>
      </main>

      {/* MOBILE STICKY BOTTOM NAVIGATION BAR */}
      {isMobile && (
        <div className={styles.mobileStickyBar}>
          <button
            className={`${styles.mobileTabBtn} ${activeTab === 'editor' ? styles.mobileTabBtnActive : ''}`}
            onClick={() => setActiveTab('editor')}
          >
            <Edit3 size={17} />
            <span>النموذج</span>
          </button>
          <button
            className={`${styles.mobileTabBtn} ${activeTab === 'smartPaste' ? styles.mobileTabBtnActive : ''}`}
            onClick={() => setActiveTab('smartPaste')}
          >
            <Sparkles size={17} />
            <span>استيراد</span>
          </button>
          <button
            className={`${styles.mobileTabBtn} ${activeTab === 'settings' ? styles.mobileTabBtnActive : ''}`}
            onClick={() => setActiveTab('settings')}
          >
            <Settings size={17} />
            <span>الإعدادات</span>
          </button>
          <button
            className={`${styles.mobileTabBtn} ${activeTab === 'preview' ? styles.mobileTabBtnActive : ''}`}
            onClick={() => setActiveTab('preview')}
          >
            <Eye size={17} />
            <span>المعاينة ({pages.length})</span>
          </button>

          {/* UNIFIED EXPORT BUTTON FOR MOBILE */}
          <div className={styles.exportWrapper} ref={exportMenuRef}>
            <button
              className={`${styles.btn} ${styles.btnPrimary}`}
              onClick={() => setShowExportMenu(!showExportMenu)}
              style={{ padding: '8px 12px', fontSize: '0.8rem' }}
            >
              <Share2 size={15} />
              <span>تصدير</span>
            </button>
            {showExportMenu && (
              <div
                className={styles.exportDropdown}
                style={{
                  top: 'auto',
                  bottom: 'calc(100% + 8px)',
                  left: 0,
                  right: 'auto',
                  minWidth: '220px'
                }}
              >
                <button
                  className={styles.dropdownItem}
                  onClick={() => {
                    setShowExportMenu(false);
                    handlePrint();
                  }}
                >
                  <Printer size={16} color="#1b5e20" />
                  <span>تحميل PDF (طباعة جاهزة)</span>
                </button>
                <div className={styles.dropdownDivider} />
                <button
                  className={styles.dropdownItem}
                  onClick={() => {
                    setShowExportMenu(false);
                    handleExportWord();
                  }}
                >
                  <FileText size={16} color="#0284c7" />
                  <span>تحميل مستند Word (.docx)</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
