import React, { useState, useMemo } from 'react';
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
  ZoomIn,
  ZoomOut,
  Maximize2,
  Layers,
  HelpCircle
} from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState('editor'); // 'editor', 'smartPaste', 'preview'
  const [examData, setExamData] = useState(defaultExamData);
  const [rawText, setRawText] = useState('');
  const [toastMessage, setToastMessage] = useState('');
  const [previewZoom, setPreviewZoom] = useState('auto'); // 'auto', '0.6', '0.75', '1'
  const [showPrintHint, setShowPrintHint] = useState(false);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3500);
  };

  // Smart text import from any source
  const handleAutoParse = () => {
    if (!rawText.trim()) {
      alert('يرجى لصق نص الأسئلة أولاً!');
      return;
    }
    const parsed = parseExamText(rawText);
    if (parsed) {
      setExamData({
        ...parsed,
        fontFamily: examData.fontFamily,
        fontSize: examData.fontSize,
        lineHeight: examData.lineHeight
      });
      showToast('تم استيراد وتحليل بيانات الأسئلة بنجاح!');
      setActiveTab('editor');
    } else {
      alert('لم يتم التعرف على نمط الأسئلة، يرجى التأكد من احتواء النص على أسئلة.');
    }
  };

  // Add new question
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
  const handleDeleteQuestion = (qId) => {
    setExamData({
      ...examData,
      questions: examData.questions.filter((q) => q.id !== qId)
    });
  };

  // Move question
  const handleMoveQuestion = (index, direction) => {
    const newQs = [...examData.questions];
    const targetIdx = index + direction;
    if (targetIdx < 0 || targetIdx >= newQs.length) return;
    const temp = newQs[index];
    newQs[index] = newQs[targetIdx];
    newQs[targetIdx] = temp;
    setExamData({ ...examData, questions: newQs });
  };

  // Update question field
  const handleUpdateQuestion = (qId, field, value) => {
    setExamData({
      ...examData,
      questions: examData.questions.map((q) =>
        q.id === qId ? { ...q, [field]: value } : q
      )
    });
  };

  // Toggle page break before a question
  const handleTogglePageBreak = (qId) => {
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

  // Group questions into discrete pages for multi-page rendering
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
    setShowPrintHint(true);
    setTimeout(() => {
      window.print();
    }, 400);
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

  // Compute CSS zoom scale
  const zoomStyle = useMemo(() => {
    if (previewZoom === 'auto') {
      return { maxWidth: '100%', transform: 'scale(1)', transformOrigin: 'top center' };
    }
    const val = parseFloat(previewZoom);
    return {
      transform: `scale(${val})`,
      transformOrigin: 'top center',
      marginBottom: `${(val - 1) * 350}px`
    };
  }, [previewZoom]);

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
                className={`${styles.tabBtn} ${activeTab === 'preview' ? styles.tabBtnActive : ''}`}
                onClick={() => setActiveTab('preview')}
              >
                <Eye size={15} />
                <span>المعاينة ({pages.length} صفحات)</span>
              </button>
            </div>

            <button className={`${styles.btn} ${styles.btnPrimary}`} onClick={handlePrint}>
              <Printer size={15} />
              <span>تحميل PDF</span>
            </button>
            <button className={`${styles.btn} ${styles.btnSecondary}`} onClick={handleExportWord}>
              <Download size={15} />
              <span>ملف Word</span>
            </button>
          </div>
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
        <div className={activeTab === 'preview' ? styles.singleColumn : styles.desktopSplit}>
          
          {/* EDIT & FORM COLUMN */}
          {activeTab !== 'preview' && (
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
                    يمكنك لصق نص الأسئلة من أي تطبيق (واتساب، تيليجرام، ملف نصي، أو مستند وورد). سيقوم النظام بالتعرف على المادة، المرحلة، الملاحظات، والأسئلة وفروعها ودرجاتها تلقائياً.
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

              {/* EXAM HEADER CARD */}
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
                    <label className={styles.label}>عنوان الصندوق الأوسط</label>
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
                  <label className={styles.label}>تحديد المادة الداخلة في الامتحان (الملاحظة العلوية)</label>
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

              {/* QUESTIONS LIST */}
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

                {examData.questions.map((q, idx) => (
                  <div key={q.id} className={styles.questionCard}>
                    <div className={styles.questionHeaderRow}>
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <input
                          className={`${styles.input} ${styles.questionNumInput}`}
                          value={q.number}
                          onChange={(e) => handleUpdateQuestion(q.id, 'number', e.target.value)}
                        />
                        <input
                          className={`${styles.input} ${styles.questionMarksInput}`}
                          value={q.marks}
                          onChange={(e) => handleUpdateQuestion(q.id, 'marks', e.target.value)}
                          placeholder="الدرجة"
                        />
                      </div>

                      <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                        {idx > 0 && (
                          <button
                            type="button"
                            className={styles.pageBreakBadge}
                            style={{
                              background: q.pageBreakBefore ? '#1b5e20' : '#f1f5f9',
                              color: q.pageBreakBefore ? '#ffffff' : '#64748b',
                              border: q.pageBreakBefore ? '1px solid #144617' : '1px dashed #cbd5e1'
                            }}
                            onClick={() => handleTogglePageBreak(q.id)}
                            title="بدء صفحة جديدة في الطباعة من هذا السؤال"
                          >
                            <Layers size={13} />
                            <span>{q.pageBreakBefore ? 'يبدأ بصفحة جديدة 📄' : 'نفس الصفحة'}</span>
                          </button>
                        )}

                        <button
                          className={`${styles.btn} ${styles.btnSecondary}`}
                          onClick={() => handleMoveQuestion(idx, -1)}
                          disabled={idx === 0}
                          title="تحريك لأعلى"
                          style={{ padding: '6px' }}
                        >
                          <MoveUp size={13} />
                        </button>
                        <button
                          className={`${styles.btn} ${styles.btnSecondary}`}
                          onClick={() => handleMoveQuestion(idx, 1)}
                          disabled={idx === examData.questions.length - 1}
                          title="تحريك لأسفل"
                          style={{ padding: '6px' }}
                        >
                          <MoveDown size={13} />
                        </button>
                        <button
                          className={`${styles.btn} ${styles.btnDanger}`}
                          onClick={() => handleDeleteQuestion(q.id)}
                          title="حذف"
                          style={{ padding: '6px' }}
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>

                    <div className={styles.inputGroup}>
                      <textarea
                        className={styles.textarea}
                        value={q.mainText}
                        onChange={(e) => handleUpdateQuestion(q.id, 'mainText', e.target.value)}
                        placeholder="نص السؤال الرئيسي أو التوجيه..."
                        rows={2}
                      />
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
                ))}

                <button className={`${styles.btn} ${styles.btnOutline}`} onClick={handleAddQuestion}>
                  <Plus size={15} /> إضافة سؤال جديد
                </button>
              </div>
            </div>
          )}

          {/* PREVIEW COLUMN (Always visible on desktop split, or in preview tab on mobile) */}
          {(activeTab === 'preview' || activeTab === 'editor') && (
            <div>
              {/* TYPOGRAPHY & ZOOM TOOLBAR */}
              <div className={styles.previewToolbar}>
                <div className={styles.toolbarGroup}>
                  <Type size={15} color="#1b5e20" />
                  <span className={styles.toolbarLabel}>نوع الخط:</span>
                  <select
                    className={styles.select}
                    value={examData.fontFamily}
                    onChange={(e) => setExamData({ ...examData, fontFamily: e.target.value })}
                    style={{ padding: '5px 8px', fontSize: '0.82rem' }}
                  >
                    <option value="Amiri">الخط الأميري (التقليدي)</option>
                    <option value="Scheherazade New">خط المصاحف (شهربان)</option>
                    <option value="Cairo">خط القاهرة الحديث</option>
                    <option value="Arial">الخط المكتبي (Arial)</option>
                  </select>
                </div>

                <div className={styles.toolbarGroup}>
                  <span className={styles.toolbarLabel}>حجم الخط:</span>
                  <input
                    type="range"
                    min="14"
                    max="20"
                    step="0.5"
                    value={examData.fontSize}
                    onChange={(e) => setExamData({ ...examData, fontSize: e.target.value })}
                    style={{ width: '80px', accentColor: '#1b5e20' }}
                  />
                  <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#1b5e20', minWidth: '35px' }}>
                    {examData.fontSize}px
                  </span>
                </div>

                <div className={styles.toolbarGroup}>
                  <span className={styles.toolbarLabel}>المعاينة:</span>
                  <select
                    className={styles.select}
                    value={previewZoom}
                    onChange={(e) => setPreviewZoom(e.target.value)}
                    style={{ padding: '5px 8px', fontSize: '0.82rem' }}
                  >
                    <option value="auto">ملاءمة العرض (تلقائي)</option>
                    <option value="0.6">60% (مصغّر)</option>
                    <option value="0.75">75% (متوسط)</option>
                    <option value="1">100% (الحجم الفعلي)</option>
                  </select>
                </div>
              </div>

              {/* MULTI-PAGE A4 PREVIEW CONTAINER */}
              <div className={styles.paperWrapper}>
                <div
                  className={styles.scaledContainer}
                  style={{
                    fontFamily: examData.fontFamily || 'Amiri',
                    fontSize: `${examData.fontSize || 16.5}px`,
                    lineHeight: examData.lineHeight || 1.6,
                    ...zoomStyle
                  }}
                >
                  {pages.map((pageQuestions, pageIdx) => {
                    const isFirstPage = pageIdx === 0;
                    const isLastPage = pageIdx === pages.length - 1;

                    return (
                      <div key={pageIdx} className={styles.a4Page}>
                        <div className={styles.pageBorder}>
                          
                          {/* TOP HEADER BOX (RENDERED ON PAGE 1) */}
                          {isFirstPage && (
                            <>
                              <div className={styles.examHeaderBox}>
                                {/* Left column */}
                                <div className={styles.headerLeft}>
                                  <div>{examData.school || 'المدرسة: فخر المخدرات'}</div>
                                  <div>المادة: {examData.subject}</div>
                                  <div>المرحلة: {examData.stage}</div>
                                  <div>{examData.semester}</div>
                                </div>

                                {/* Center column */}
                                <div className={styles.headerCenter}>
                                  <img src="/logo.png" alt="الشعار" className={styles.centerLogo} />
                                  <div className={styles.centerTitleBadge}>
                                    {examData.termTitle || 'امتحانات الفصل الأول'}
                                  </div>
                                </div>

                                {/* Right column */}
                                <div className={styles.headerRight}>
                                  {(examData.centerHeader || []).map((line, lIdx) => (
                                    <div key={lIdx}>{line}</div>
                                  ))}
                                </div>
                              </div>

                              {/* Notice Banner */}
                              {examData.notice && (
                                <div className={styles.examNotice}>
                                  {examData.notice}
                                </div>
                              )}
                            </>
                          )}

                          {/* QUESTIONS FOR THIS SPECIFIC PAGE */}
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
                    );
                  })}
                </div>
              </div>
            </div>
          )}

        </div>
      </main>

      {/* STICKY BOTTOM ACTIONS FOR MOBILE */}
      <div className={styles.mobileStickyBar}>
        <button
          className={`${styles.btn} ${styles.btnSecondary}`}
          onClick={() => setActiveTab(activeTab === 'preview' ? 'editor' : 'preview')}
          style={{ flex: 1 }}
        >
          <Eye size={15} />
          {activeTab === 'preview' ? 'النموذج' : 'معاينة A4'}
        </button>
        <button
          className={`${styles.btn} ${styles.btnPrimary}`}
          onClick={handlePrint}
          style={{ flex: 1 }}
        >
          <Printer size={15} />
          PDF
        </button>
        <button
          className={`${styles.btn} ${styles.btnSecondary}`}
          onClick={handleExportWord}
          style={{ flex: 1 }}
        >
          <Download size={15} />
          Word
        </button>
      </div>
    </div>
  );
}
