import React, { useState, useMemo, useEffect, useRef } from 'react';
import styles from './App.module.css';
import { defaultExamData, parseExamText } from './utils/parser';
import { exportToDocx, generateDocxBlob } from './utils/docxExporter';
import html2pdf from 'html2pdf.js';
import fileSaver from 'file-saver';
const saveAs = fileSaver.saveAs || fileSaver;
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
  Share2,
  Send,
  MessageCircle,
  Smartphone,
  RotateCcw,
  X
} from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState('editor'); // 'editor', 'smartPaste', 'settings', 'preview'
  const [examData, setExamData] = useState(defaultExamData);
  const [rawText, setRawText] = useState('');
  const [toastMessage, setToastMessage] = useState('');
  const [expandedQuestions, setExpandedQuestions] = useState({});
  const [isMobile, setIsMobile] = useState(typeof window !== 'undefined' ? window.innerWidth < 768 : false);
  const [windowWidth, setWindowWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1200);
  const [showExportModal, setShowExportModal] = useState(false);
  const [selectedExportFormat, setSelectedExportFormat] = useState('docx'); // 'docx' or 'pdf'
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showPwaBanner, setShowPwaBanner] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [isAutoFit, setIsAutoFit] = useState(true);
  const touchStartRef = useRef(null);

  useEffect(() => {
    const handleResize = () => {
      const w = window.innerWidth;
      setWindowWidth(w);
      setIsMobile(w < 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // PWA Install prompt listener
  useEffect(() => {
    const handleBeforeInstall = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      if (!localStorage.getItem('pwa_prompt_dismissed')) {
        setShowPwaBanner(true);
      }
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstall);

    const isStandalone = typeof window !== 'undefined' && (
      window.matchMedia('(display-mode: standalone)').matches ||
      window.navigator.standalone === true
    );
    if (!isStandalone && !localStorage.getItem('pwa_prompt_dismissed')) {
      setShowPwaBanner(true);
    }

    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
  }, []);

  const handleInstallPwa = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setShowPwaBanner(false);
      }
      setDeferredPrompt(null);
    } else {
      alert('لتثبيت التطبيق على جهازك:\n- على متصفح Chrome / Android: اضغط على القائمة (⋮) ثم "تثبيت التطبيق" أو "إضافة للشاشة الرئيسية".\n- على Safari (iOS): اضغط زر المشاركة ثم "إضافة إلى الشاشة الرئيسية".');
    }
  };

  const handleDismissPwa = () => {
    setShowPwaBanner(false);
    localStorage.setItem('pwa_prompt_dismissed', 'true');
  };

  // Auto-calculated scale to fit the A4 page (794px wide) neatly within screen width
  const fitScale = useMemo(() => {
    if (typeof window === 'undefined') return 1;
    const availableWidth = isMobile ? (windowWidth - 20) : Math.min(794, (windowWidth / 2) - 48);
    const scale = availableWidth / 794;
    return Math.min(1, Math.max(0.32, parseFloat(scale.toFixed(2))));
  }, [windowWidth, isMobile]);

  const activeZoom = isAutoFit ? fitScale : zoomLevel;

  // Touch pinch-to-zoom handlers on mobile preview
  const handleTouchStart = (e) => {
    if (e.touches.length === 2) {
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      touchStartRef.current = { dist, initialZoom: activeZoom };
    }
  };

  const handleTouchMove = (e) => {
    if (e.touches.length === 2 && touchStartRef.current) {
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      const factor = dist / touchStartRef.current.dist;
      const newZoom = Math.min(1.8, Math.max(0.32, parseFloat((touchStartRef.current.initialZoom * factor).toFixed(2))));
      setIsAutoFit(false);
      setZoomLevel(newZoom);
    }
  };

  // Clear all fields to start blank
  const handleClearAll = () => {
    if (window.confirm('هل أنت متأكد من مسح جميع بيانات الامتحان والأسئلة للبدء بنموذج فارغ؟')) {
      setExamData({
        ...examData,
        subject: '',
        stage: '',
        school: '',
        notice: '',
        teacher: '',
        questions: []
      });
      showToast('تم مسح جميع البيانات بنجاح والبدء بنموذج فارغ');
    }
  };

  // Restore generic sample exam
  const handleRestoreSample = () => {
    setExamData(defaultExamData);
    showToast('تمت استعادة النموذج التجريبي بنجاح');
  };

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

  // Handle PDF Print (No toast shown during print to prevent it appearing on exported PDF)
  const handlePrint = () => {
    if (isMobile && activeTab !== 'preview') {
      setActiveTab('preview');
    }
    setTimeout(() => {
      window.print();
    }, 150);
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

  // Generate 1:1 A4 PDF Blob using html2pdf
  const generatePdfBlob = async () => {
    const container = document.querySelector(`.${styles.pageContainerMobile}`);
    if (!container) throw new Error('Preview container not found');

    // Clone container to avoid affecting live preview DOM
    const clone = container.cloneNode(true);
    clone.style.width = '794px';
    clone.style.margin = '0 auto';
    clone.style.background = '#ffffff';

    const wrappers = clone.querySelectorAll(`.${styles.pageMobileWrapper}`);
    wrappers.forEach((w) => {
      w.style.width = '794px';
      w.style.height = '1123px';
      w.style.transform = 'none';
      w.style.marginBottom = '0';
    });

    const pageElements = clone.querySelectorAll(`.${styles.a4Page}`);
    pageElements.forEach((p, idx) => {
      p.style.transform = 'none';
      p.style.position = 'relative';
      p.style.left = '0';
      p.style.marginLeft = '0';
      p.style.width = '794px';
      p.style.height = '1123px';
      p.style.boxShadow = 'none';
      if (idx < pageElements.length - 1) {
        p.style.pageBreakAfter = 'always';
      }
    });

    const hiddenWrapper = document.createElement('div');
    hiddenWrapper.style.position = 'fixed';
    hiddenWrapper.style.top = '-9999px';
    hiddenWrapper.style.left = '-9999px';
    hiddenWrapper.style.width = '794px';
    hiddenWrapper.appendChild(clone);
    document.body.appendChild(hiddenWrapper);

    try {
      const opt = {
        margin: 0,
        filename: `${examData.subject || 'أسئلة'}_امتحان.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, logging: false },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
      };
      return await html2pdf().set(opt).from(clone).output('blob');
    } finally {
      if (document.body.contains(hiddenWrapper)) {
        document.body.removeChild(hiddenWrapper);
      }
    }
  };

  // Unified Native Mobile Share (Word .docx or PDF)
  const handleShareFile = async (format) => {
    try {
      const isDocx = format === 'docx';
      showToast(isDocx ? 'جارٍ تجهيز مستند Word للمشاركة...' : 'جارٍ تجهيز ملف PDF للمشاركة...');

      let blob;
      let filename;
      let mimeType;

      if (isDocx) {
        blob = await generateDocxBlob(examData);
        filename = `${examData.subject || 'أسئلة'}_${examData.stage || 'امتحان'}.docx`;
        mimeType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
      } else {
        blob = await generatePdfBlob();
        filename = `${examData.subject || 'أسئلة'}_${examData.stage || 'امتحان'}.pdf`;
        mimeType = 'application/pdf';
      }

      const file = new File([blob], filename, { type: mimeType });

      // Native Mobile Share Sheet (Android / iOS / supported OS)
      if (typeof navigator !== 'undefined' && navigator.share) {
        try {
          if (!navigator.canShare || navigator.canShare({ files: [file] })) {
            await navigator.share({
              title: examData.title || 'أسئلة الامتحان',
              text: `مرفق ملف أسئلة: ${examData.subject || ''} (${examData.stage || ''})`,
              files: [file]
            });
            showToast('تمت مشاركة الملف بنجاح!');
            return;
          }
        } catch (shareErr) {
          if (shareErr.name === 'AbortError') {
            return; // User cancelled the native share dialog
          }
          console.warn('Native share failed, downloading instead:', shareErr);
        }
      }

      // Graceful Fallback: Download file directly to user device without web redirects
      saveAs(blob, filename);
      showToast('تم حفظ الملف في جهازك بنجاح! يمكنك الآن مشاركته وإرساله عبر أي تطبيق تفضله.');
    } catch (err) {
      console.error('Share error:', err);
      if (format === 'docx') {
        await exportToDocx(examData);
      } else {
        handlePrint();
      }
      showToast('تم تنزيل الملف على جهازك.');
    }
  };

  // Header Box Class based on Settings
  const headerBoxClass = useMemo(() => {
    if (examData.headerBoxStyle === 'rounded') return styles.headerBoxRounded;
    if (examData.headerBoxStyle === 'borderless') return styles.headerBoxBorderless;
    if (examData.headerBoxStyle === 'modernRibbon') return styles.headerBoxModernRibbon;
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

              {/* EXPORT & SHARE BUTTON (Opens 2-Step Modal) */}
              <button
                className={`${styles.btn} ${styles.btnPrimary}`}
                onClick={() => setShowExportModal(true)}
              >
                <Share2 size={16} />
                <span>تصدير أو مشاركة</span>
              </button>
            </div>
          )}
        </div>
      </header>

      {/* PWA INSTALL BANNER */}
      {showPwaBanner && (
        <div className={`${styles.pwaBanner} ${styles.noPrint}`}>
          <div className={styles.pwaBannerText}>
            <Smartphone size={20} color="#1b5e20" />
            <span>📱 هل تود تثبيت تطبيق منظومة الأسئلة على جهازك للوصول السريع بدون متصفح؟</span>
          </div>
          <div className={styles.pwaBannerActions}>
            <button
              className={`${styles.btn} ${styles.btnPrimary}`}
              style={{ padding: '6px 14px', fontSize: '0.82rem' }}
              onClick={handleInstallPwa}
            >
              تثبيت التطبيق
            </button>
            <button
              className={`${styles.btn} ${styles.btnSecondary}`}
              style={{ padding: '6px 10px', fontSize: '0.82rem' }}
              onClick={handleDismissPwa}
            >
              لاحقاً
            </button>
          </div>
        </div>
      )}

      {/* Toast Notification (Strictly hidden in print to avoid appearing on exported PDF) */}
      {toastMessage && (
        <div className={`${styles.toastNotification} ${styles.noPrint}`}>
          <CheckCircle2 size={16} />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Main Workspace */}
      <main className={styles.mainLayout}>
        <div className={(!isMobile && activeTab !== 'preview') ? styles.desktopSplit : styles.singleColumn}>
          
          {/* EDIT & FORM COLUMN (Hidden on mobile if activeTab === 'preview', hidden in print) */}
          <div className={`${(!isMobile || activeTab !== 'preview') ? styles.formColumnVisible : styles.formColumnHidden} ${styles.noPrint}`}>
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
                        <span className={styles.settingOptionName}>بدون إطار خارجي (Clean Editorial)</span>
                        <span className={styles.settingOptionDesc}>مفتوح وأنيق مع خط فاصل سفلي فقط</span>
                      </div>
                      <div
                        className={`${styles.settingOptionCard} ${examData.headerBoxStyle === 'modernRibbon' ? styles.settingOptionSelected : ''}`}
                        onClick={() => setExamData({ ...examData, headerBoxStyle: 'modernRibbon' })}
                      >
                        <span className={styles.settingOptionName}>بطاقة حديثة بشريط علوي (Modern Ribbon)</span>
                        <span className={styles.settingOptionDesc}>خلفية هادئة وشريط بلون العتبة العباسية الأخضر</span>
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
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <button
                        type="button"
                        className={`${styles.btn} ${styles.btnSecondary}`}
                        onClick={handleRestoreSample}
                        style={{ padding: '4px 10px', fontSize: '0.78rem' }}
                        title="استعادة النموذج التوضيحي"
                      >
                        <RotateCcw size={13} />
                        <span>نموذج تجريبي</span>
                      </button>
                      <button
                        type="button"
                        className={`${styles.btn} ${styles.btnDanger}`}
                        onClick={handleClearAll}
                        style={{ padding: '4px 10px', fontSize: '0.78rem' }}
                        title="مسح جميع البيانات والبدء بنموذج فارغ"
                      >
                        <Trash2 size={13} />
                        <span>مسح الكل</span>
                      </button>
                    </div>
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
                            {/* Row 1: Question Number & Marks */}
                            <div className={styles.questionRowNumberMarks}>
                              <div className={styles.inputGroup} style={{ flex: '0 0 110px' }}>
                                <label className={styles.label}>رقم السؤال</label>
                                <input
                                  className={`${styles.input} ${styles.questionNumInput}`}
                                  value={q.number}
                                  onChange={(e) => handleUpdateQuestion(q.id, 'number', e.target.value)}
                                  placeholder="س١ / أو 1."
                                />
                              </div>
                              <div className={styles.inputGroup} style={{ flex: '0 0 110px' }}>
                                <label className={styles.label}>الدرجة</label>
                                <input
                                  className={`${styles.input} ${styles.questionMarksInput}`}
                                  value={q.marks}
                                  onChange={(e) => handleUpdateQuestion(q.id, 'marks', e.target.value)}
                                  placeholder="(٢٠ د)"
                                />
                              </div>
                            </div>

                            {/* Row 2: Dedicated Full-Width Question Prompt Textarea */}
                            <div className={styles.questionRowText}>
                              <label className={styles.label}>التوجيه / نص السؤال الرئيسي</label>
                              <textarea
                                className={`${styles.input} ${styles.questionMainTextarea}`}
                                value={q.mainText}
                                onChange={(e) => handleUpdateQuestion(q.id, 'mainText', e.target.value)}
                                placeholder="اكتبي نص وتوجيه السؤال هنا بالتفصيل (مثال: عرفي المفاهيم الفقهية التالية...)"
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
          </div>

          {/* PREVIEW COLUMN (Always rendered in DOM so printing to PDF works from any tab) */}
          <div className={(!isMobile || activeTab === 'preview') ? styles.previewContainerVisible : styles.previewContainerHidden}>
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

                {/* ZOOM CONTROLS (FIT TO SCREEN / ZOOM IN / ZOOM OUT / 100% REAL PRINT) */}
                <div className={styles.toolbarGroup}>
                  <span className={styles.toolbarLabel}>معاينة:</span>
                  <div className={styles.stepperContainer}>
                    <button
                      type="button"
                      className={styles.stepperBtn}
                      onClick={() => {
                        setIsAutoFit(false);
                        setZoomLevel(prev => Math.max(0.35, parseFloat((prev - 0.08).toFixed(2))));
                      }}
                      title="تصغير المعاينة"
                    >
                      -
                    </button>
                    <span
                      className={styles.stepperValue}
                      style={{ minWidth: '55px', cursor: 'pointer' }}
                      onClick={() => setIsAutoFit(!isAutoFit)}
                      title="انقر للتبديل بين الاحتواء والحجم الأصلي"
                    >
                      {Math.round(activeZoom * 100)}%
                    </span>
                    <button
                      type="button"
                      className={styles.stepperBtn}
                      onClick={() => {
                        setIsAutoFit(false);
                        setZoomLevel(prev => Math.min(1.4, parseFloat((prev + 0.08).toFixed(2))));
                      }}
                      title="تكبير المعاينة"
                    >
                      +
                    </button>
                  </div>
                  <button
                    type="button"
                    className={`${styles.btn} ${styles.btnSecondary}`}
                    style={{ padding: '4px 8px', fontSize: '0.74rem' }}
                    onClick={() => {
                      if (isAutoFit) {
                        setIsAutoFit(false);
                        setZoomLevel(1.0);
                      } else {
                        setIsAutoFit(true);
                      }
                    }}
                    title={isAutoFit ? 'عرض بحجم الطباعة الحقيقي 100%' : 'ملاءمة الصفحة مع الشاشة'}
                  >
                    {isAutoFit ? '100% طباعة' : '📱 احتواء'}
                  </button>
                </div>
              </div>

              {/* A4 PREVIEW CONTAINER (With Native Touch Pinch-to-Zoom & Pan) */}
              <div
                className={styles.paperWrapper}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
              >
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
                      <div
                        key={pageIdx}
                        className={styles.pageMobileWrapper}
                        style={{
                          width: `${Math.round(794 * activeZoom)}px`,
                          height: `${Math.round(1123 * activeZoom)}px`,
                          position: 'relative'
                        }}
                      >
                        <div
                          className={styles.a4Page}
                          style={{
                            transform: `scale(${activeZoom})`,
                            transformOrigin: 'top center',
                            position: 'absolute',
                            top: 0,
                            left: '50%',
                            marginLeft: '-397px'
                          }}
                        >
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
                                      {q.number && <span>{q.number} </span>}
                                      <span>{q.mainText}</span>
                                    </div>
                                    {q.marks && <span className={styles.paperMarks}>{q.marks}</span>}
                                  </div>

                                  {/* Sub branches */}
                                  {q.branches && q.branches.map((b) => (
                                    <div key={b.id} className={styles.paperBranchItem}>
                                      <div>
                                        {b.label && <strong>{b.label} </strong>}
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
          </div>

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

          {/* EXPORT BUTTON FOR MOBILE */}
          <button
            className={`${styles.btn} ${styles.btnPrimary}`}
            onClick={() => setShowExportModal(true)}
            style={{ padding: '8px 14px', fontSize: '0.82rem', borderRadius: '8px' }}
          >
            <Share2 size={15} />
            <span>تصدير</span>
          </button>
        </div>
      )}

      {/* UNIFIED 2-STEP EXPORT & SHARE MODAL */}
      {showExportModal && (
        <div className={styles.exportModalOverlay} onClick={() => setShowExportModal(false)}>
          <div className={styles.exportModal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.exportModalHeader}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Share2 size={18} color="#1b5e20" />
                <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: '#1b5e20' }}>
                  تصدير ومشاركة الامتحان
                </h3>
              </div>
              <button
                type="button"
                className={styles.btnSecondary}
                onClick={() => setShowExportModal(false)}
                style={{ padding: '4px 8px', borderRadius: '6px', border: 'none', cursor: 'pointer', background: '#e2e8f0' }}
              >
                <X size={16} />
              </button>
            </div>

            <div className={styles.exportModalBody}>
              {/* Step 1: Format Selection */}
              <div>
                <label className={styles.label} style={{ marginBottom: '8px', display: 'block', fontWeight: 700 }}>
                  ١. اختر صيغة الملف المطلوبة:
                </label>
                <div className={styles.formatOptionGrid}>
                  <div
                    className={`${styles.formatCard} ${selectedExportFormat === 'docx' ? styles.formatCardActive : ''}`}
                    onClick={() => setSelectedExportFormat('docx')}
                  >
                    <FileText size={28} color="#0284c7" />
                    <span style={{ fontWeight: 700, fontSize: '0.9rem', color: '#0f172a' }}>مستند وورد (Word)</span>
                    <span style={{ fontSize: '0.74rem', color: '#64748b' }}>صيغة docx متوافقة وقابلة للتعديل</span>
                  </div>

                  <div
                    className={`${styles.formatCard} ${selectedExportFormat === 'pdf' ? styles.formatCardActive : ''}`}
                    onClick={() => setSelectedExportFormat('pdf')}
                  >
                    <Printer size={28} color="#1b5e20" />
                    <span style={{ fontWeight: 700, fontSize: '0.9rem', color: '#0f172a' }}>ملف PDF جاهز</span>
                    <span style={{ fontSize: '0.74rem', color: '#64748b' }}>طباعة مباشرة بحجم A4 رسمي</span>
                  </div>
                </div>
              </div>

              {/* Step 2: Action Selection */}
              <div>
                <label className={styles.label} style={{ marginBottom: '8px', display: 'block', fontWeight: 700 }}>
                  ٢. اختر طريقة الحفظ أو المشاركة:
                </label>
                <div className={styles.actionButtonGroup}>
                  <button
                    type="button"
                    className={`${styles.btn} ${styles.btnPrimary}`}
                    style={{ padding: '12px', fontSize: '0.92rem', justifyContent: 'center' }}
                    onClick={() => {
                      setShowExportModal(false);
                      if (selectedExportFormat === 'docx') {
                        handleExportWord();
                      } else {
                        handlePrint();
                      }
                    }}
                  >
                    <Download size={18} />
                    <span>تنزيل على جهازي ({selectedExportFormat === 'docx' ? 'مستند Word' : 'ملف PDF'})</span>
                  </button>

                  <button
                    type="button"
                    className={`${styles.btn} ${styles.btnOutline}`}
                    style={{ padding: '12px', fontSize: '0.92rem', justifyContent: 'center' }}
                    onClick={() => {
                      setShowExportModal(false);
                      handleShareFile(selectedExportFormat);
                    }}
                  >
                    <Share2 size={18} />
                    <span>مشاركة الملف عبر التطبيقات (واتساب، تيليجرام...)</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
