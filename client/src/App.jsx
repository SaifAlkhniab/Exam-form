import React, { useState } from 'react';
import styles from './App.module.css';
import { defaultExamData, parseWhatsAppExamText } from './utils/parser';
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
  School
} from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState('editor'); // 'editor', 'smartPaste', 'preview'
  const [examData, setExamData] = useState(defaultExamData);
  const [rawText, setRawText] = useState('');
  const [toastMessage, setToastMessage] = useState('');
  const [isDesktopSplit, setIsDesktopSplit] = useState(true);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3500);
  };

  // Handle WhatsApp text auto-fill
  const handleAutoParse = () => {
    if (!rawText.trim()) {
      alert('يرجى لصق نص رسالة واتساب أولاً!');
      return;
    }
    const parsed = parseWhatsAppExamText(rawText);
    if (parsed) {
      setExamData(parsed);
      showToast('تم استخراج بيانات الامتحان والأسئلة بنجاح!');
      setActiveTab('editor');
    } else {
      alert('لم نتمكن من تحليل النص، تأكد من وجود نص الأسئلة.');
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

  // Move question up/down
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

  // Add branch to question
  const handleAddBranch = (qId) => {
    const arabicLetters = ['أ', 'ب', 'ج', 'د', 'هـ', 'و', 'ز'];
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

  // Update branch field
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

  // Print / Save as PDF
  const handlePrintPDF = () => {
    window.print();
  };

  // Export to Word (.docx)
  const handleExportWord = async () => {
    try {
      showToast('جارٍ إنشاء ملف Word (.docx)...');
      await exportToDocx(examData);
      showToast('تم تحميل ملف Word بنجاح!');
    } catch (err) {
      console.error(err);
      alert('حدث خطأ أثناء إنشاء ملف Word: ' + err.message);
    }
  };

  return (
    <div className={styles.appContainer}>
      {/* Top Navigation */}
      <header className={styles.topNav}>
        <div className={styles.navContent}>
          <div className={styles.brand}>
            <img src="/logo.png" alt="الشعار" className={styles.brandLogo} />
            <div>
              <h1 className={styles.brandTitle}>منظومة إعداد الأسئلة الامتحانية</h1>
              <p className={styles.brandSubtitle}>العتبة العباسية المقدسة - مدارس الكفيل</p>
            </div>
          </div>

          <div className={styles.topActions}>
            <div className={styles.tabBar}>
              <button
                className={`${styles.tabBtn} ${activeTab === 'editor' ? styles.tabBtnActive : ''}`}
                onClick={() => setActiveTab('editor')}
              >
                <Edit3 size={16} />
                <span>النموذج</span>
              </button>
              <button
                className={`${styles.tabBtn} ${activeTab === 'smartPaste' ? styles.tabBtnActive : ''}`}
                onClick={() => setActiveTab('smartPaste')}
              >
                <ClipboardPaste size={16} />
                <span>لصق واتساب</span>
              </button>
              <button
                className={`${styles.tabBtn} ${activeTab === 'preview' ? styles.tabBtnActive : ''}`}
                onClick={() => setActiveTab('preview')}
              >
                <Eye size={16} />
                <span>المعاينة</span>
              </button>
            </div>

            <button className={`${styles.btn} ${styles.btnPrimary}`} onClick={handlePrintPDF}>
              <Printer size={16} />
              <span>تحميل PDF</span>
            </button>
            <button className={`${styles.btn} ${styles.btnSecondary}`} onClick={handleExportWord}>
              <Download size={16} />
              <span>ملف Word</span>
            </button>
          </div>
        </div>
      </header>

      {/* Toast Notification */}
      {toastMessage && (
        <div style={{
          position: 'fixed',
          top: 70,
          left: '50%',
          transform: 'translateX(-50%)',
          background: '#1b5e20',
          color: '#ffffff',
          padding: '10px 20px',
          borderRadius: '8px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          fontSize: '0.9rem',
          fontWeight: 600
        }}>
          <CheckCircle2 size={18} />
          {toastMessage}
        </div>
      )}

      {/* Main Workspace */}
      <main className={styles.mainLayout}>
        <div className={activeTab === 'preview' ? styles.singleColumn : styles.desktopSplit}>
          
          {/* LEFT / EDIT SECTION (Visible when in editor or smartPaste tabs) */}
          {activeTab !== 'preview' && (
            <div>
              {/* Smart WhatsApp Paste Box */}
              {activeTab === 'smartPaste' && (
                <div className={styles.card}>
                  <div className={styles.cardHeader}>
                    <h2 className={styles.cardTitle}>
                      <Sparkles size={18} />
                      لصق رسالة واتساب للتحليل التلقائي
                    </h2>
                  </div>
                  <p style={{ fontSize: '0.85rem', color: '#64748b', marginTop: 0 }}>
                    الصق نص رسالة الامتحان التي وصلتك على واتساب مباشرة، وسيقوم النظام باستخراج المادة، المرحلة، الملاحظات، والأسئلة وفروعها ودرجاتها فوراً.
                  </p>
                  <textarea
                    className={styles.pasteTextarea}
                    placeholder="الصق رسالة الواتساب هنا..."
                    value={rawText}
                    onChange={(e) => setRawText(e.target.value)}
                  />
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button className={`${styles.btn} ${styles.btnPrimary}`} onClick={handleAutoParse}>
                      <Sparkles size={16} />
                      استخراج البيانات والأسئلة تلقائياً
                    </button>
                    <button
                      className={`${styles.btn} ${styles.btnSecondary}`}
                      onClick={() => setRawText('')}
                    >
                      مسح النص
                    </button>
                  </div>
                </div>
              )}

              {/* Exam Header Fields */}
              <div className={styles.card}>
                <div className={styles.cardHeader}>
                  <h2 className={styles.cardTitle}>
                    <School size={18} />
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
                      placeholder="عقائد"
                    />
                  </div>

                  <div className={styles.inputGroup}>
                    <label className={styles.label}>المرحلة</label>
                    <input
                      className={styles.input}
                      value={examData.stage}
                      onChange={(e) => setExamData({ ...examData, stage: e.target.value })}
                      placeholder="تمهيدي"
                    />
                  </div>

                  <div className={styles.inputGroup}>
                    <label className={styles.label}>الفصل / الدور</label>
                    <input
                      className={styles.input}
                      value={examData.semester}
                      onChange={(e) => setExamData({ ...examData, semester: e.target.value })}
                      placeholder="الفصل: الأول"
                    />
                  </div>

                  <div className={styles.inputGroup}>
                    <label className={styles.label}>عنوان الصندوق الأوسط</label>
                    <input
                      className={styles.input}
                      value={examData.termTitle}
                      onChange={(e) => setExamData({ ...examData, termTitle: e.target.value })}
                      placeholder="امتحانات الفصل الأول"
                    />
                  </div>

                  <div className={styles.inputGroup}>
                    <label className={styles.label}>اسم المدرسة</label>
                    <input
                      className={styles.input}
                      value={examData.school}
                      onChange={(e) => setExamData({ ...examData, school: e.target.value })}
                      placeholder="المدرسة: فخر المخدرات"
                    />
                  </div>

                  <div className={styles.inputGroup}>
                    <label className={styles.label}>العام الدراسي</label>
                    <input
                      className={styles.input}
                      value={examData.year}
                      onChange={(e) => setExamData({ ...examData, year: e.target.value })}
                      placeholder="1448 هـ"
                    />
                  </div>
                </div>

                <div className={styles.inputGroup} style={{ marginTop: '12px' }}>
                  <label className={styles.label}>ملاحظة الامتحان / المادة الداخلة</label>
                  <input
                    className={styles.input}
                    value={examData.notice}
                    onChange={(e) => setExamData({ ...examData, notice: e.target.value })}
                    placeholder="تحديد المادة الداخلة في الامتحان من بداية الكتاب إلى د١١غير داخل"
                  />
                </div>

                <div className={styles.inputGroup} style={{ marginTop: '12px' }}>
                  <label className={styles.label}>اسم أستاذة / أستاذ المادة</label>
                  <input
                    className={styles.input}
                    value={examData.teacher}
                    onChange={(e) => setExamData({ ...examData, teacher: e.target.value })}
                    placeholder="انتظار شعلان عبد الرزاق"
                  />
                </div>
              </div>

              {/* Questions List */}
              <div className={styles.card}>
                <div className={styles.cardHeader}>
                  <h2 className={styles.cardTitle}>
                    <FileText size={18} />
                    قائمة الأسئلة ({examData.questions.length})
                  </h2>
                  <button className={`${styles.btn} ${styles.btnPrimary}`} onClick={handleAddQuestion}>
                    <Plus size={16} />
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
                          placeholder="س١"
                        />
                        <input
                          className={`${styles.input} ${styles.questionMarksInput}`}
                          value={q.marks}
                          onChange={(e) => handleUpdateQuestion(q.id, 'marks', e.target.value)}
                          placeholder="الدرجة: (٢٠ د)"
                        />
                      </div>

                      <div style={{ display: 'flex', gap: '4px' }}>
                        <button
                          className={`${styles.btn} ${styles.btnSecondary}`}
                          onClick={() => handleMoveQuestion(idx, -1)}
                          disabled={idx === 0}
                          title="تحريك لأعلى"
                          style={{ padding: '6px' }}
                        >
                          <MoveUp size={14} />
                        </button>
                        <button
                          className={`${styles.btn} ${styles.btnSecondary}`}
                          onClick={() => handleMoveQuestion(idx, 1)}
                          disabled={idx === examData.questions.length - 1}
                          title="تحريك لأسفل"
                          style={{ padding: '6px' }}
                        >
                          <MoveDown size={14} />
                        </button>
                        <button
                          className={`${styles.btn} ${styles.btnDanger}`}
                          onClick={() => handleDeleteQuestion(q.id)}
                          title="حذف السؤال"
                          style={{ padding: '6px' }}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>

                    <div className={styles.inputGroup}>
                      <textarea
                        className={styles.textarea}
                        value={q.mainText}
                        onChange={(e) => handleUpdateQuestion(q.id, 'mainText', e.target.value)}
                        placeholder="نص السؤال الرئيسي أو التوجيه (مثال: عرفي خمسة مما يأتي...)"
                        rows={2}
                      />
                    </div>

                    {/* Sub Branches */}
                    {q.branches && q.branches.length > 0 && (
                      <div style={{ marginTop: '10px' }}>
                        {q.branches.map((b) => (
                          <div key={b.id} className={styles.branchRow}>
                            <div className={styles.branchHeader}>
                              <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                                <span style={{ fontSize: '0.8rem', color: '#64748b' }}>الفرع:</span>
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
                              placeholder="محتوى الفرع، النقاط، أو الفراغات..."
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
                        style={{ fontSize: '0.8rem', padding: '6px 10px' }}
                      >
                        <Plus size={12} /> إضافة فرع (أ / ب / ج)
                      </button>
                    </div>
                  </div>
                ))}

                <button className={`${styles.btn} ${styles.btnOutline}`} onClick={handleAddQuestion}>
                  <Plus size={16} /> إضافة سؤال جديد
                </button>
              </div>
            </div>
          )}

          {/* RIGHT / A4 LIVE PREVIEW (Always visible on desktop split, or in preview tab on mobile) */}
          {(activeTab === 'preview' || isDesktopSplit) && (
            <div className={styles.paperWrapper}>
              <div className={styles.examPaper}>
                <div className={styles.paperBorder}>
                  
                  {/* Top Header Box */}
                  <div className={styles.examHeaderBox}>
                    {/* Left details */}
                    <div className={styles.headerLeft}>
                      <div>{examData.school || 'المدرسة: فخر المخدرات'}</div>
                      <div>المادة: {examData.subject}</div>
                      <div>المرحلة: {examData.stage}</div>
                      <div>{examData.semester}</div>
                    </div>

                    {/* Center Logo & Title */}
                    <div className={styles.headerCenter}>
                      <img src="/logo.png" alt="الشعار" className={styles.centerLogo} />
                      <div className={styles.centerTitleBadge}>
                        {examData.termTitle || 'امتحانات الفصل الأول'}
                      </div>
                    </div>

                    {/* Right details */}
                    <div className={styles.headerRight}>
                      {(examData.centerHeader || []).map((line, idx) => (
                        <div key={idx}>{line}</div>
                      ))}
                    </div>
                  </div>

                  {/* Notice banner */}
                  {examData.notice && (
                    <div className={styles.examNotice}>
                      {examData.notice}
                    </div>
                  )}

                  {/* Questions */}
                  <div className={styles.paperQuestions}>
                    {examData.questions.map((q, idx) => (
                      <div key={q.id} className={styles.paperQuestionItem}>
                        <div className={styles.paperQuestionTitle}>
                          <div>
                            <span>{q.number}/ </span>
                            <span>{q.mainText}</span>
                          </div>
                          {q.marks && <span className={styles.paperMarks}>{q.marks}</span>}
                        </div>

                        {/* Branches */}
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

                  {/* Teacher Footer */}
                  {examData.teacher && (
                    <div className={styles.paperFooter}>
                      أستاذة المادة : {examData.teacher}
                    </div>
                  )}

                </div>
              </div>
            </div>
          )}

        </div>
      </main>

      {/* Sticky Bottom Actions Bar for Mobile Phones */}
      <div className={styles.mobileStickyBar}>
        <button
          className={`${styles.btn} ${styles.btnSecondary}`}
          onClick={() => setActiveTab(activeTab === 'preview' ? 'editor' : 'preview')}
          style={{ flex: 1 }}
        >
          <Eye size={16} />
          {activeTab === 'preview' ? 'العودة للنموذج' : 'معاينة A4'}
        </button>
        <button
          className={`${styles.btn} ${styles.btnPrimary}`}
          onClick={handlePrintPDF}
          style={{ flex: 1 }}
        >
          <Printer size={16} />
          تحميل PDF
        </button>
        <button
          className={`${styles.btn} ${styles.btnSecondary}`}
          onClick={handleExportWord}
          style={{ flex: 1 }}
        >
          <Download size={16} />
          Word
        </button>
      </div>
    </div>
  );
}
