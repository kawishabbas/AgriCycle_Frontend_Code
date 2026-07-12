import React, { useCallback,  useState  } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
  ActivityIndicator,
  Alert,
  Dimensions,
  Platform,
  Modal
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as Speech from 'expo-speech';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import AppHeader from '../components/AppHeader';
import Colors from '../theme/colors';
import { BASE_URL } from '../api/client';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../context/AuthContext';

const { width } = Dimensions.get('window');

const LABELS = {
  en: {
    title: 'AI Crop Doctor',
    subtitle: 'Upload a photo of your crop to get instant diagnosis and treatment advice',
    voiceLanguage: 'Voice Language:',
    takePhoto: 'Take or Upload Photo',
    tapToCapture: 'Tap to capture or select image from gallery',
    changePhoto: 'Change Photo',
    analyzing: 'Analyzing...',
    analyzeCrop: 'Analyze Crop',
    diagnosisComplete: 'Diagnosis Complete',
    diseaseDetected: 'Disease Detected',
    confidence: 'Confidence',
    description: 'Description',
    cause: 'Cause',
    symptoms: 'Symptoms',
    treatment: 'Treatment',
    medicines: 'Recommended Medicines',
    instructions: 'Instructions',
    prevention: 'Prevention',
    expertTips: 'Expert Tips',
    diagnoseAnother: 'Diagnose Another',
    photoTips: 'Photo Tips',
    tips: ['Take clear, well-lit photos', 'Focus on affected leaves or areas', 'Include multiple angles if possible'],
    translating: 'Translating...',
  },
  hi: {
    title: 'AI फसल डॉक्टर',
    subtitle: 'तुरंत निदान और उपचार सलाह पाने के लिए अपनी फसल की फोटो अपलोड करें',
    voiceLanguage: 'आवाज़ भाषा:',
    takePhoto: 'फोटो लें या अपलोड करें',
    tapToCapture: 'कैप्चर करने के लिए टैप करें या गैलरी से चुनें',
    changePhoto: 'फोटो बदलें',
    analyzing: 'विश्लेषण हो रहा है...',
    analyzeCrop: 'फसल विश्लेषण करें',
    diagnosisComplete: 'निदान पूरा हुआ',
    diseaseDetected: 'बीमारी का पता चला',
    confidence: 'विश्वास',
    description: 'विवरण',
    cause: 'कारण',
    symptoms: 'लक्षण',
    treatment: 'उपचार',
    medicines: 'अनुशंसित दवाएं',
    instructions: 'निर्देश',
    prevention: 'रोकथाम',
    expertTips: 'विशेषज्ञ सुझाव',
    diagnoseAnother: 'दूसरी फसल जांचें',
    photoTips: 'फोटो टिप्स',
    tips: ['स्पष्ट, अच्छी रोशनी वाली तस्वीरें लें', 'प्रभावित पत्तियों पर ध्यान दें', 'यदि संभव हो तो कई कोणों से तस्वीरें लें'],
    translating: 'अनुवाद हो रहा है...',
  },
  ur: {
    title: 'AI فصل ڈاکٹر',
    subtitle: 'فوری تشخیص اور علاج کے مشورے کے لیے اپنی فصل کی تصویر اپلوڈ کریں',
    voiceLanguage: ':آواز کی زبان',
    takePhoto: 'تصویر لیں یا اپلوڈ کریں',
    tapToCapture: 'کیپچر کرنے کے لیے ٹیپ کریں یا گیلری سے منتخب کریں',
    changePhoto: 'تصویر تبدیل کریں',
    analyzing: '...تجزیہ ہو رہا ہے',
    analyzeCrop: 'فصل کا تجزیہ کریں',
    diagnosisComplete: 'تشخیص مکمل ہو گئی',
    diseaseDetected: 'بیماری کا پتہ چلا',
    confidence: 'اعتماد',
    description: 'تفصیل',
    cause: 'وجہ',
    symptoms: 'علامات',
    treatment: 'علاج',
    medicines: 'تجویز کردہ دوائیں',
    instructions: 'ہدایات',
    prevention: 'احتیاط',
    expertTips: 'ماہرانہ مشورے',
    diagnoseAnother: 'دوسری فصل جانچیں',
    photoTips: 'تصویر کے مشورے',
    tips: ['واضح، روشن تصویریں لیں', 'متاثرہ پتوں پر توجہ دیں', 'اگر ممکن ہو تو مختلف زاویوں سے تصویریں لیں'],
    translating: '...ترجمہ ہو رہا ہے',
  },
};

const AIHelpScreen = ({ navigation }) => {
  const { user } = useAuth();
  const [image, setImage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [showLimitModal, setShowLimitModal] = useState(false);
  const [ttsLanguage, setTtsLanguage] = useState('en');
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isTranslatingUI, setIsTranslatingUI] = useState(false);
  const [translatedResult, setTranslatedResult] = useState(null);
  const [ttsError, setTtsError] = useState(null);
  const [currentSectionIdx, setCurrentSectionIdx] = useState(-1);

  // Refs so async TTS callbacks always see fresh values
  const sectionsRef       = React.useRef([]);   // current section list
  const sectionIdxRef     = React.useRef(-1);   // current section index
  const manualStopRef     = React.useRef(false); // true when user stops/mutes/skips
  const ttsLocaleRef      = React.useRef('en-US');

  // ─── Stop speech on unmount ───────────────────────────────────────────────
  React.useEffect(() => { return () => { Speech.stop(); }; }, []);

  // ─── Translation: backend → MyMemory → GTX (triple-fallback) ─────────────
  const translateText = async (text, targetLang) => {
    if (targetLang === 'en' || !text || !text.trim()) return text;

    // 1️⃣  Backend proxy (most reliable, no CORS)
    try {
      const res = await fetch(`${BASE_URL}/ai/translate/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ text, target: targetLang }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.translated && data.translated.trim() && data.translated !== text)
          return data.translated;
      }
    } catch (_) {}

    // 2️⃣  MyMemory API (CORS-safe on React Native, 500 char limit)
    try {
      const chunk = text.slice(0, 490);
      const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(chunk)}&langpair=en|${targetLang}`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.responseStatus === 200 && data.responseData?.translatedText) {
        const tr = data.responseData.translatedText.trim();
        if (tr && tr !== chunk) {
          return tr + (text.length > 490 ? ' ' + text.slice(490) : '');
        }
      }
    } catch (_) {}

    // 3️⃣  Google GTX (may be blocked on browsers but works on native)
    try {
      const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=${targetLang}&dt=t&q=${encodeURIComponent(text)}`;
      const res = await fetch(url);
      const data = await res.json();
      const tr = data[0].map(item => item[0]).join('').trim();
      if (tr && tr !== text) return tr;
    } catch (_) {}

    return text; // last resort: return original
  };

  // ─── Translate full result for UI whenever result or language changes ──────
  React.useEffect(() => {
    let alive = true;
    const run = async () => {
      if (!result) { if (alive) setTranslatedResult(null); return; }
      if (ttsLanguage === 'en') { if (alive) setTranslatedResult(result); return; }
      if (alive) setIsTranslatingUI(true);
      try {
        const tr = (t) => translateText(t, ttsLanguage);
        const trArr = async (arr) => {
          if (!arr || !Array.isArray(arr)) return [];
          const out = [];
          for (const item of arr) out.push(await tr(item));
          return out;
        };

        // Translate field by field, update state incrementally so user sees
        // each field appear translated as soon as it's ready
        let partial = { ...result };

        partial.disease     = await tr(result.disease);
        if (alive) setTranslatedResult({ ...partial });

        partial.description = result.description ? await tr(result.description) : '';
        if (alive) setTranslatedResult({ ...partial });

        partial.cause       = result.cause ? await tr(result.cause) : '';
        if (alive) setTranslatedResult({ ...partial });

        partial.symptoms    = await trArr(result.symptoms);
        if (alive) setTranslatedResult({ ...partial });

        partial.treatment   = await trArr(result.treatment);
        if (alive) setTranslatedResult({ ...partial });

        partial.medicines   = await trArr(result.medicines);
        if (alive) setTranslatedResult({ ...partial });

        partial.instructions = await trArr(result.instructions);
        if (alive) setTranslatedResult({ ...partial });

        partial.prevention  = await trArr(result.prevention);
        if (alive) setTranslatedResult({ ...partial });

        partial.expert_tips = await trArr(result.expert_tips);
        if (alive) setTranslatedResult({ ...partial });

      } catch (e) {
        console.error('UI translate error:', e);
        if (alive) setTranslatedResult(result);
      } finally {
        if (alive) setIsTranslatingUI(false);
      }
    };
    run();
    return () => { alive = false; };
  }, [result, ttsLanguage]);

  // ─── Build sections array (name + text) from translated data ─────────────
  const buildSections = (d, labels) => {
    const s = [];
    const add = (name, text) => { if (text) s.push({ name, text }); };
    add(labels.diseaseDetected, d.disease);
    add(labels.description,     d.description);
    add(labels.cause,           d.cause);
    if (d.symptoms?.length)     s.push({ name: labels.symptoms,     text: d.symptoms.join('. ') });
    if (d.treatment?.length)    s.push({ name: labels.treatment,    text: d.treatment.join('. ') });
    if (d.medicines?.length)    s.push({ name: labels.medicines,    text: d.medicines.join(', ') });
    if (d.instructions?.length) s.push({ name: labels.instructions, text: d.instructions.join('. ') });
    if (d.prevention?.length)   s.push({ name: labels.prevention,   text: d.prevention.join('. ') });
    if (d.expert_tips?.length)  s.push({ name: labels.expertTips,   text: d.expert_tips.join('. ') });
    return s;
  };

  // ─── Get best available TTS locale ───────────────────────────────────────
  const getLocale = async (lang) => {
    const pref = { ur: ['ur-PK', 'ur-IN', 'ur'], hi: ['hi-IN', 'hi'], en: ['en-US', 'en-GB', 'en'] };
    const candidates = pref[lang] || ['en-US'];
    try {
      const voices = await Speech.getAvailableVoicesAsync();
      if (voices?.length) {
        for (const c of candidates) {
          const hit = voices.find(v => v.language?.toLowerCase().startsWith(c.split('-')[0]));
          if (hit) return hit.language;
        }
      }
    } catch (_) {}
    return candidates[0];
  };

  // ─── Speak a single section by index (auto-advances) ────────────────────
  const speakSection = (idx, sections, locale) => {
    if (idx < 0 || idx >= sections.length) {
      setIsSpeaking(false); setIsPaused(false);
      setCurrentSectionIdx(-1); sectionIdxRef.current = -1;
      return;
    }
    const { name, text } = sections[idx];
    sectionIdxRef.current = idx;
    setCurrentSectionIdx(idx);
    const fullText = `${name}. ${text}`;
    Speech.speak(fullText, {
      language: locale,
      onDone: () => {
        if (!manualStopRef.current) speakSection(sectionIdxRef.current + 1, sections, locale);
        else manualStopRef.current = false;
      },
      onError: (err) => {
        console.error('TTS error', err);
        setTtsError(ttsLanguage === 'ur'
          ? 'آپ کے آلے پر اردو آواز دستیاب نہیں۔ اردو TTS انسٹال کریں۔'
          : 'Voice not available for this language on your device.');
        setIsSpeaking(false); setIsPaused(false);
      },
      onStopped: () => { /* controlled by manualStopRef */ },
    });
  };

  // ─── Start from the beginning ────────────────────────────────────────────
  const speakResult = async () => {
    const data = translatedResult || result;
    if (!data) return;
    const labels = LABELS[ttsLanguage] || LABELS.en;
    const sections = buildSections(data, labels);
    if (!sections.length) return;
    sectionsRef.current = sections;
    setTtsError(null); setIsMuted(false); setIsSpeaking(true); setIsPaused(false);
    manualStopRef.current = false;
    const locale = await getLocale(ttsLanguage);
    ttsLocaleRef.current = locale;
    speakSection(0, sections, locale);
  };

  // ─── Play / Pause toggle ─────────────────────────────────────────────────
  const togglePlayPause = async () => {
    if (!isSpeaking) {
      speakResult();
    } else if (isPaused) {
      await Speech.resume();
      setIsPaused(false);
    } else {
      await Speech.pause();
      setIsPaused(true);
    }
  };

  // ─── Mute / Unmute toggle ────────────────────────────────────────────────
  const toggleMute = async () => {
    if (isMuted) {
      setIsMuted(false);
      // Resume from current section
      const idx = sectionIdxRef.current < 0 ? 0 : sectionIdxRef.current;
      setIsSpeaking(true); setIsPaused(false);
      manualStopRef.current = false;
      speakSection(idx, sectionsRef.current, ttsLocaleRef.current);
    } else {
      manualStopRef.current = true;
      await Speech.stop();
      setIsMuted(true); setIsSpeaking(false); setIsPaused(false);
    }
  };

  // ─── Skip to next section ─────────────────────────────────────────────────
  const goNext = async () => {
    const next = sectionIdxRef.current + 1;
    if (next >= sectionsRef.current.length) return;
    manualStopRef.current = true;
    await Speech.stop();
    setIsSpeaking(true); setIsPaused(false); setIsMuted(false);
    manualStopRef.current = false;
    speakSection(next, sectionsRef.current, ttsLocaleRef.current);
  };

  // ─── Skip to previous section ─────────────────────────────────────────────
  const goPrev = async () => {
    const prev = Math.max(0, sectionIdxRef.current - 1);
    manualStopRef.current = true;
    await Speech.stop();
    setIsSpeaking(true); setIsPaused(false); setIsMuted(false);
    manualStopRef.current = false;
    speakSection(prev, sectionsRef.current, ttsLocaleRef.current);
  };

  const pickImage = async () => {
    try {
      if (Platform.OS !== 'web') {
        const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (permissionResult.granted === false) {
          Alert.alert('Permission Required', 'You need to allow access to your photos to upload an image.');
          return;
        }
      }

      let pickerResult = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.8,
      });

      if (!pickerResult.canceled) {
        if (pickerResult.assets && pickerResult.assets.length > 0) {
          setImage(pickerResult.assets[0]);
        } else if (pickerResult.uri) {
          setImage(pickerResult);
        }
        setResult(null); // Clear previous result
      }
    } catch (error) {
      if (Platform.OS !== 'web') {
        Alert.alert('Error', 'We could not open your photos. Please try again.');
      } else {
        window.alert('We could not open your photos. Please try again.');
      }
      console.error('ImagePicker Error:', error);
    }
  };

  const analyzeImage = async () => {
    if (!image) {
      if (Platform.OS !== 'web') {
        Alert.alert('Image Required', 'Please select a crop photo to analyze.');
      } else {
        window.alert('Please select a crop photo to analyze.');
      }
      return;
    }

    if (!user) {
      try {
        const countStr = await AsyncStorage.getItem('guest_ai_usage_count');
        const count = countStr ? parseInt(countStr) : 0;
        if (count >= 5) {
          setShowLimitModal(true);
          return;
        }
      } catch (err) {
        console.error('AsyncStorage error:', err);
      }
    }

    setLoading(true);
    setResult(null);

    const formData = new FormData();
    
    try {
      if (Platform.OS === 'web') {
        // On Web, FormData requires a Blob or File object, not a URI string
        const res = await fetch(image.uri);
        const blob = await res.blob();
        formData.append('image', blob, 'crop.jpg');
      } else {
        // On Mobile, React Native uses this special object format
        formData.append('image', {
          uri: image.uri,
          type: image.mimeType || 'image/jpeg',
          name: image.fileName || image.uri.split('/').pop() || 'crop.jpg'
        });
      }

      const response = await fetch(`${BASE_URL}/ai/predict-proxy/`, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
        },
        body: formData,
      });

      if (!response.ok) {
        let errText = `We could not process this image right now. Please try again later.`;
        throw new Error(errText);
      }

      const data = await response.json();
      setResult(data);

      if (!user) {
        try {
          const countStr = await AsyncStorage.getItem('guest_ai_usage_count');
          const count = countStr ? parseInt(countStr) : 0;
          await AsyncStorage.setItem('guest_ai_usage_count', (count + 1).toString());
        } catch (err) {
          console.error('AsyncStorage set error:', err);
        }
      }
    } catch (error) {
      console.error('API Error:', error);
      const errorMessage = error.message.includes('Failed to fetch') || error.message.includes('Network request failed') 
        ? 'Please check your internet connection and try again.' 
        : 'We could not analyze the image at this time. Please try again later.';

      if (Platform.OS !== 'web') {
        Alert.alert('Analysis Failed', `Error: ${errorMessage}`);
      } else {
        window.alert(`Analysis Failed\nError: ${errorMessage}`);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setImage(null);
    setResult(null);
    setTranslatedResult(null);
    Speech.stop();
    setIsSpeaking(false);
    setIsPaused(false);
    setIsMuted(false);
    setTtsError(null);
    setCurrentSectionIdx(-1);
    sectionsRef.current = [];
    sectionIdxRef.current = -1;
    manualStopRef.current = false;
  };

  const getConfidenceColor = (confidence) => {
    if (confidence > 90) return '#4CAF50'; // Green
    if (confidence >= 70) return '#FF9800'; // Orange
    return '#F44336'; // Red
  };

  const isRTL = ttsLanguage === 'ur';

  const renderBulletPoints = (items, iconName) => {
    if (!items || !items.length) return null;
    return items.map((item, index) => (
      <View key={index} style={[styles.bulletRow, isRTL && { flexDirection: 'row-reverse' }]}>
        <MaterialCommunityIcons name={iconName} size={18} color="#2E7D32"
          style={[styles.bulletIcon, isRTL && { marginRight: 0, marginLeft: 8 }]} />
        <Text style={[styles.bulletText, isRTL && { textAlign: 'right', writingDirection: 'rtl' }]}>{item}</Text>
      </View>
    ));
  };

  const displayResult = translatedResult || result;
  const t = LABELS[ttsLanguage] || LABELS.en;
  const titleRTL = isRTL ? { textAlign: 'right', writingDirection: 'rtl' } : {};
  const sectionTitleRTL = isRTL ? { textAlign: 'right', writingDirection: 'rtl', flexDirection: 'row-reverse' } : {};

  return (
    <View style={styles.root}>
      <AppHeader hideSearch={true} />

      <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
        {/* Hero */}
        <View style={styles.heroSection}>
          <View style={styles.iconCircle}>
            <MaterialCommunityIcons name="robot-outline" size={36} color={Colors.purple} />
          </View>
          <Text style={styles.title}>{t.title}</Text>
          <Text style={styles.subtitle}>{t.subtitle}</Text>

          {/* Language Selector */}
          <View style={[styles.langSelector, isRTL && { flexDirection: 'row-reverse' }]}>
            <Text style={[styles.langLabel, titleRTL]}>{t.voiceLanguage}</Text>
            <View style={styles.langButtons}>
              {['en', 'hi', 'ur'].map(lang => (
                <TouchableOpacity 
                  key={lang}
                  style={[styles.langBtn, ttsLanguage === lang && styles.langBtnActive]}
                  onPress={() => {
                    setTtsLanguage(lang);
                    setTtsError(null);
                    Speech.stop();
                    setIsSpeaking(false);
                    setIsPaused(false);
                  }}
                >
                  <Text style={[styles.langBtnText, ttsLanguage === lang && styles.langBtnTextActive]}>
                    {lang.toUpperCase()}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>

        <View style={styles.uploadSection}>
          <TouchableOpacity style={styles.imageContainer} onPress={pickImage} activeOpacity={0.8}>
            {image ? (
              <>
                <Image source={{ uri: image.uri }} style={styles.previewImage} />
                <View style={styles.changePhotoBtn}>
                  <Ionicons name="camera-outline" size={16} color="#FFF" />
                  <Text style={styles.changePhotoText}>Change Photo</Text>
                </View>
              </>
            ) : (
              <View style={styles.placeholderContainer}>
                <Ionicons name="camera-outline" size={40} color="#999" />
                <Text style={[styles.placeholderText, titleRTL]}>{t.takePhoto}</Text>
                <Text style={[styles.placeholderSubtext, titleRTL]}>{t.tapToCapture}</Text>
              </View>
            )}
          </TouchableOpacity>

          {image && !displayResult && (
            <TouchableOpacity 
              style={[styles.analyzeButton, loading && styles.analyzeButtonLoading]} 
              onPress={analyzeImage}
              disabled={loading}
            >
              {loading ? (
                <>
                  <ActivityIndicator color="#FFF" size="small" />
                  <Text style={styles.analyzeButtonText}>{t.analyzing}</Text>
                </>
              ) : (
                <>
                  <MaterialCommunityIcons name="magnify-scan" size={20} color="#FFF" style={{marginRight: 8}} />
                  <Text style={styles.analyzeButtonText}>{t.analyzeCrop}</Text>
                </>
              )}
            </TouchableOpacity>
          )}
        </View>

        {displayResult && (
          <View style={styles.resultContainer}>
            <View style={styles.reportHeader}>
              <View style={{flexDirection: 'row', alignItems: 'center', flex: 1, gap: 8}}>
                <MaterialCommunityIcons name="check-circle" size={22} color="#2E7D32" />
                <Text style={styles.reportTitle}>{t.diagnosisComplete}</Text>
              </View>
              {isTranslatingUI && (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <ActivityIndicator size="small" color="#1976D2" />
                  <Text style={styles.translatingLabel}>{t.translating}</Text>
                </View>
              )}
            </View>

            {/* ── Voice Advisory Media Player ─────────────────────────────── */}
            <View style={styles.voicePlayer}>
              {/* Section indicator */}
              <View style={styles.voicePlayerInfo}>
                <MaterialCommunityIcons name="waveform" size={16} color="#1976D2" />
                <Text style={styles.voicePlayerSection} numberOfLines={1}>
                  {currentSectionIdx >= 0 && sectionsRef.current.length > 0
                    ? `${currentSectionIdx + 1} / ${sectionsRef.current.length}  ·  ${sectionsRef.current[currentSectionIdx]?.name}`
                    : t.diagnosisComplete}
                </Text>
              </View>

              {/* Controls row */}
              <View style={styles.voiceControlRow}>
                {/* Previous */}
                <TouchableOpacity
                  style={[styles.ttsCircleBtn, styles.ttsBtnIdle, currentSectionIdx <= 0 && styles.ttsBtnDisabled]}
                  onPress={goPrev}
                  disabled={currentSectionIdx <= 0}
                >
                  <MaterialCommunityIcons name="skip-previous" size={20} color="#FFF" />
                </TouchableOpacity>

                {/* Play / Pause */}
                <TouchableOpacity
                  style={[styles.ttsCircleBtnLg, (isSpeaking && !isPaused) ? styles.ttsBtnActive : styles.ttsBtnIdle]}
                  onPress={togglePlayPause}
                >
                  <MaterialCommunityIcons
                    name={isSpeaking && !isPaused ? 'pause' : 'play'}
                    size={26}
                    color="#FFF"
                  />
                </TouchableOpacity>

                {/* Next */}
                <TouchableOpacity
                  style={[
                    styles.ttsCircleBtn, styles.ttsBtnIdle,
                    (currentSectionIdx < 0 || currentSectionIdx >= (sectionsRef.current.length - 1)) && styles.ttsBtnDisabled
                  ]}
                  onPress={goNext}
                  disabled={currentSectionIdx < 0 || currentSectionIdx >= (sectionsRef.current.length - 1)}
                >
                  <MaterialCommunityIcons name="skip-next" size={20} color="#FFF" />
                </TouchableOpacity>

                {/* Mute / Unmute */}
                <TouchableOpacity
                  style={[styles.ttsCircleBtn, isMuted ? styles.ttsBtnMuted : styles.ttsBtnIdle]}
                  onPress={toggleMute}
                >
                  <MaterialCommunityIcons
                    name={isMuted ? 'volume-off' : 'volume-high'}
                    size={20}
                    color="#FFF"
                  />
                </TouchableOpacity>
              </View>
            </View>

            {/* TTS error banner */}
            {ttsError ? (
              <View style={styles.ttsErrorBanner}>
                <MaterialCommunityIcons name="alert-circle-outline" size={16} color="#E65100" />
                <Text style={[styles.ttsErrorText, isRTL && { textAlign: 'right', writingDirection: 'rtl' }]}>
                  {ttsError}
                </Text>
              </View>
            ) : null}

            
            <View style={styles.cardRow}>
              <View style={[styles.card, styles.diseaseCard]}>
                <MaterialCommunityIcons name="virus-outline" size={24} color="#D32F2F" />
                <Text style={[styles.cardLabel, titleRTL]}>{t.diseaseDetected}</Text>
                <Text style={[styles.diseaseName, titleRTL]}>{displayResult.disease}</Text>
              </View>
              
              <View style={[styles.card, styles.confidenceCard]}>
                <MaterialCommunityIcons 
                  name="chart-donut" 
                  size={24} 
                  color={getConfidenceColor(displayResult.confidence)} 
                />
                <Text style={[styles.cardLabel, titleRTL]}>{t.confidence}</Text>
                <Text style={[styles.confidenceValue, { color: getConfidenceColor(displayResult.confidence) }]}>
                  {displayResult.confidence.toFixed(1)}%
                </Text>
              </View>
            </View>

            {/* Description */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, sectionTitleRTL]}>
                <Ionicons name="information-circle-outline" size={20} color="#2E7D32" /> {t.description}
              </Text>
              <Text style={[styles.descriptionText, isRTL && { textAlign: 'right', writingDirection: 'rtl' }]}>{displayResult.description}</Text>
            </View>

            {/* Cause */}
            {displayResult.cause ? (
              <View style={[styles.section, styles.causeSection]}>
                <Text style={[styles.sectionTitle, styles.causeSectionTitle, sectionTitleRTL]}>
                  <MaterialCommunityIcons name="bug-outline" size={20} color="#E65100" /> {t.cause}
                </Text>
                <Text style={[styles.descriptionText, isRTL && { textAlign: 'right', writingDirection: 'rtl' }]}>{displayResult.cause}</Text>
              </View>
            ) : null}

            {/* Symptoms */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, sectionTitleRTL]}>
                <MaterialCommunityIcons name="thermometer-alert" size={20} color="#2E7D32" /> {t.symptoms}
              </Text>
              {renderBulletPoints(displayResult.symptoms, "alert-circle-outline")}
            </View>

            {/* Treatment */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, sectionTitleRTL]}>
                <MaterialCommunityIcons name="medical-bag" size={20} color="#2E7D32" /> {t.treatment}
              </Text>
              {renderBulletPoints(displayResult.treatment, "check-circle-outline")}
            </View>

            {/* Medicines */}
            {displayResult.medicines && displayResult.medicines.length > 0 ? (
              <View style={[styles.section, styles.medicineSection]}>
                <Text style={[styles.sectionTitle, styles.medicineSectionTitle, sectionTitleRTL]}>
                  <MaterialCommunityIcons name="pill" size={20} color="#1565C0" /> {t.medicines}
                </Text>
                {displayResult.medicines.map((med, index) => (
                  <View key={index} style={[styles.medicineBadge, isRTL && { flexDirection: 'row-reverse' }]}>
                    <MaterialCommunityIcons name="pill" size={14} color="#1565C0" />
                    <Text style={[styles.medicineText, isRTL && { textAlign: 'right', writingDirection: 'rtl' }]}>{med}</Text>
                  </View>
                ))}
              </View>
            ) : null}

            {/* Instructions */}
            {displayResult.instructions && displayResult.instructions.length > 0 ? (
              <View style={styles.section}>
                <Text style={[styles.sectionTitle, sectionTitleRTL]}>
                  <MaterialCommunityIcons name="clipboard-list-outline" size={20} color="#2E7D32" /> {t.instructions}
                </Text>
                {displayResult.instructions.map((step, index) => (
                  <View key={index} style={[styles.instructionRow, isRTL && { flexDirection: 'row-reverse' }]}>
                    <View style={styles.stepBadge}>
                      <Text style={styles.stepNumber}>{index + 1}</Text>
                    </View>
                    <Text style={[styles.bulletText, isRTL && { textAlign: 'right', writingDirection: 'rtl' }]}>{step}</Text>
                  </View>
                ))}
              </View>
            ) : null}

            {/* Prevention */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, sectionTitleRTL]}>
                <MaterialCommunityIcons name="shield-check" size={20} color="#2E7D32" /> {t.prevention}
              </Text>
              {renderBulletPoints(displayResult.prevention, "shield-half-full")}
            </View>

            {/* Expert Tips */}
            {displayResult.expert_tips && displayResult.expert_tips.length > 0 ? (
              <View style={[styles.section, styles.expertSection]}>
                <Text style={[styles.sectionTitle, styles.expertSectionTitle, sectionTitleRTL]}>
                  <MaterialCommunityIcons name="lightbulb-on-outline" size={20} color="#F57F17" /> {t.expertTips}
                </Text>
                {displayResult.expert_tips.map((tip, index) => (
                  <View key={index} style={[styles.expertTipRow, isRTL && { flexDirection: 'row-reverse' }]}>
                    <MaterialCommunityIcons name="star-circle" size={16} color="#F9A825"
                      style={[styles.bulletIcon, isRTL && { marginRight: 0, marginLeft: 8 }]} />
                    <Text style={[styles.bulletText, isRTL && { textAlign: 'right', writingDirection: 'rtl' }]}>{tip}</Text>
                  </View>
                ))}
              </View>
            ) : null}

            <TouchableOpacity style={styles.resetBtn} onPress={handleReset}>
              <Ionicons name="refresh-outline" size={16} color="#2E7D32" />
              <Text style={styles.resetBtnText}>{t.diagnoseAnother}</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Photo Tips (only when no result) */}
        {!displayResult && (
          <View style={styles.tipsCard}>
            <View style={[styles.tipsHeader, isRTL && { flexDirection: 'row-reverse' }]}>
              <Ionicons name="information-circle-outline" size={18} color="#0288D1" />
              <Text style={[styles.tipsTitle, titleRTL]}>{t.photoTips}</Text>
            </View>
            {t.tips.map((tip, index) => (
              <View key={index} style={[styles.tipRow, isRTL && { flexDirection: 'row-reverse' }]}>
                <Ionicons name="checkmark" size={16} color="#2E7D32" />
                <Text style={[styles.tipText, titleRTL]}>{tip}</Text>
              </View>
            ))}
          </View>
        )}

      </ScrollView>

      {/* Limit Modal */}
      <Modal
        visible={showLimitModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowLimitModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalIconCircle}>
              <MaterialCommunityIcons name="alert-circle-outline" size={40} color="#F57F17" />
            </View>
            <Text style={styles.modalTitle}>Limit Reached</Text>
            <Text style={styles.modalMessage}>
              You have reached the maximum limit of 5 free image analyses. Please sign in or sign up to continue using our AI Crop Doctor.
            </Text>
            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={[styles.modalBtn, styles.modalBtnSecondary]} 
                onPress={() => setShowLimitModal(false)}
              >
                <Text style={styles.modalBtnTextSecondary}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.modalBtn, styles.modalBtnPrimary]} 
                onPress={() => {
                  setShowLimitModal(false);
                  navigation.navigate('AuthStack', { screen: 'Login' });
                }}
              >
                <Text style={styles.modalBtnTextPrimary}>Sign In</Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity 
              style={styles.modalLink}
              onPress={() => {
                setShowLimitModal(false);
                navigation.navigate('AuthStack', { screen: 'CreateAccount' });
              }}
            >
              <Text style={styles.modalLinkText}>Don't have an account? Sign Up</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F5F9F5' },
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
    alignItems: 'center',
  },
  heroSection: {
    alignItems: 'center',
    marginBottom: 20,
    marginTop: 10,
  },
  iconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#F3E5F5',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: { fontSize: 24, fontWeight: '700', color: '#1B5E20', textAlign: 'center', marginBottom: 6 },
  subtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 20,
  },
  uploadSection: {
    width: '100%',
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
    marginBottom: 20,
  },
  imageContainer: {
    width: '100%',
    height: 200,
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    marginBottom: 16,
  },
  previewImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  changePhotoBtn: {
    position: 'absolute',
    bottom: 10,
    right: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  changePhotoText: { color: '#FFF', fontSize: 12, fontWeight: '600' },
  placeholderContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderText: {
    marginTop: 12,
    fontSize: 16,
    color: '#374151',
    fontWeight: '600',
  },
  placeholderSubtext: {
    marginTop: 4,
    fontSize: 13,
    color: '#6B7280',
  },
  analyzeButton: {
    backgroundColor: '#2E7D32',
    borderRadius: 12,
    paddingVertical: 15,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  analyzeButtonLoading: {
    opacity: 0.8,
  },
  analyzeButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  resultContainer: {
    width: '100%',
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  reportHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE',
    paddingBottom: 12,
    marginBottom: 16,
    gap: 8,
  },
  reportTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1B5E20',
  },
  cardRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  card: {
    width: (width - 70) / 2,
    backgroundColor: '#F5F9F5',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E8F5E9',
  },
  diseaseCard: {
    backgroundColor: '#FFF5F5',
    borderColor: '#FFEBEE',
  },
  confidenceCard: {
    backgroundColor: '#F0FDF4',
    borderColor: '#E8F5E9',
  },
  cardLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 8,
    marginBottom: 4,
  },
  diseaseName: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#D32F2F',
    textAlign: 'center',
  },
  confidenceValue: {
    fontSize: 20,
    fontWeight: '900',
  },
  section: {
    marginBottom: 16,
    backgroundColor: '#F9FCF9',
    padding: 14,
    borderRadius: 10,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2E7D32',
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  descriptionText: {
    fontSize: 14,
    lineHeight: 20,
    color: '#444',
  },
  bulletRow: {
    flexDirection: 'row',
    marginBottom: 6,
    alignItems: 'flex-start',
    paddingRight: 10,
  },
  bulletIcon: {
    marginTop: 2,
    marginRight: 8,
  },
  bulletText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
    color: '#444',
  },
  resetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1.5,
    borderColor: '#2E7D32',
    borderRadius: 10,
    paddingVertical: 12,
    marginTop: 8,
  },
  resetBtnText: { color: '#2E7D32', fontSize: 15, fontWeight: '600' },
  // Cause section
  causeSection: { backgroundColor: '#FFF3E0', borderWidth: 1, borderColor: '#FFE0B2' },
  causeSectionTitle: { color: '#E65100' },
  // Medicine section
  medicineSection: { backgroundColor: '#E3F2FD', borderWidth: 1, borderColor: '#BBDEFB' },
  medicineSectionTitle: { color: '#1565C0' },
  medicineBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#fff',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: '#BBDEFB',
  },
  medicineText: { fontSize: 14, color: '#1565C0', fontWeight: '600', flex: 1 },
  // Instructions with numbered steps
  instructionRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 10,
    gap: 10,
  },
  stepBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#2E7D32',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 2,
  },
  stepNumber: { color: '#fff', fontSize: 12, fontWeight: 'bold' },
  // Expert Tips section
  expertSection: { backgroundColor: '#FFFDE7', borderWidth: 1, borderColor: '#FFF9C4' },
  expertSectionTitle: { color: '#F57F17' },
  expertTipRow: {
    flexDirection: 'row',
    marginBottom: 6,
    alignItems: 'flex-start',
    paddingRight: 10,
  },
  tipsCard: {
    width: '100%',
    backgroundColor: '#E1F5FE',
    borderRadius: 12,
    padding: 16,
    gap: 10,
  },
  tipsHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  tipsTitle: { fontSize: 15, fontWeight: '700', color: '#01579B' },
  tipRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  tipText: { fontSize: 13, color: '#0277BD', flex: 1 },
  // Language Selector
  langSelector: { flexDirection: 'row', alignItems: 'center', marginTop: 16, gap: 10 },
  langLabel: { fontSize: 14, color: '#555', fontWeight: '600' },
  langButtons: { flexDirection: 'row', gap: 6 },
  langBtn: { paddingVertical: 4, paddingHorizontal: 12, borderRadius: 12, backgroundColor: '#E0E0E0' },
  langBtnActive: { backgroundColor: '#2E7D32' },
  langBtnText: { fontSize: 13, fontWeight: '700', color: '#555' },
  langBtnTextActive: { color: '#FFF' },
  ttsBtn: { padding: 4 },
  voiceControlRow: { flexDirection: 'row', alignItems: 'center', gap: 8, justifyContent: 'center' },
  voicePlayer: {
    backgroundColor: '#E3F2FD',
    borderRadius: 14, padding: 12, marginBottom: 14,
    borderWidth: 1, borderColor: '#BBDEFB',
  },
  voicePlayerInfo: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 },
  voicePlayerSection: { flex: 1, fontSize: 13, color: '#1565C0', fontWeight: '600' },
  ttsCircleBtn: {
    width: 38, height: 38, borderRadius: 19,
    justifyContent: 'center', alignItems: 'center',
  },
  ttsCircleBtnLg: {
    width: 50, height: 50, borderRadius: 25,
    justifyContent: 'center', alignItems: 'center',
  },
  ttsBtnIdle: { backgroundColor: '#78909C' },
  ttsBtnActive: { backgroundColor: '#1976D2' },
  ttsBtnMuted: { backgroundColor: '#D32F2F' },
  ttsBtnDisabled: { backgroundColor: '#B0BEC5', opacity: 0.5 },
  translatingLabel: { fontSize: 12, color: '#1976D2', marginLeft: 6 },
  ttsErrorBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#FFF3E0', borderRadius: 8,
    paddingHorizontal: 12, paddingVertical: 8,
    marginBottom: 12, borderWidth: 1, borderColor: '#FFE0B2',
  },
  ttsErrorText: { fontSize: 13, color: '#E65100', flex: 1, lineHeight: 18 },
  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  modalContent: { backgroundColor: '#FFF', borderRadius: 20, padding: 24, width: '100%', alignItems: 'center', elevation: 10 },
  modalIconCircle: { width: 70, height: 70, borderRadius: 35, backgroundColor: '#FFF9C4', justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  modalTitle: { fontSize: 22, fontWeight: 'bold', color: '#333', marginBottom: 12 },
  modalMessage: { fontSize: 15, color: '#666', textAlign: 'center', lineHeight: 22, marginBottom: 24 },
  modalButtons: { flexDirection: 'row', gap: 12, width: '100%', marginBottom: 16 },
  modalBtn: { flex: 1, paddingVertical: 14, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  modalBtnSecondary: { backgroundColor: '#F5F5F5' },
  modalBtnPrimary: { backgroundColor: '#28B463' },
  modalBtnTextSecondary: { fontSize: 15, fontWeight: '700', color: '#666' },
  modalBtnTextPrimary: { fontSize: 15, fontWeight: '700', color: '#FFF' },
  modalLink: { paddingVertical: 8 },
  modalLinkText: { fontSize: 14, color: '#28B463', fontWeight: '600' },
});

export default AIHelpScreen;
