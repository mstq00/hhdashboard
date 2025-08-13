import { Sentence, PronunciationDictionary } from '@/types/tts';

/**
 * 텍스트를 문장으로 분할하는 함수
 * 한국어와 영어 문장 분할을 지원합니다
 */
export function splitTextIntoSentences(text: string): string[] {
  console.log('splitTextIntoSentences called with:', JSON.stringify(text));
  
  if (!text || text.trim().length === 0) return [];

  // 한국어와 영어 문장 구분자를 모두 지원
  const sentenceEnders = /[.!?。！？]/;
  const rawSentences = text
    .split(sentenceEnders)
    .map(sentence => sentence.trim())
    .filter(sentence => sentence.length > 0);

  console.log('Raw sentences after split:', rawSentences);

  // 너무 짧은 문장들을 이전 문장과 합치기
  const sentences: string[] = [];
  
  for (let i = 0; i < rawSentences.length; i++) {
    let currentSentence = rawSentences[i];
    const textWithoutPunctuation = currentSentence.replace(/[.!?。！？]/g, '').trim();
    
    console.log(`Processing sentence ${i}: "${currentSentence}", length without punctuation: ${textWithoutPunctuation.length}`);
    
    // 너무 짧은 문장(2글자 미만)이면 이전 문장과 합치기
    if (textWithoutPunctuation.length < 2 && sentences.length > 0) {
      const lastIndex = sentences.length - 1;
      console.log(`Merging "${currentSentence}" with previous sentence`);
      sentences[lastIndex] = sentences[lastIndex].replace(/[.!?。！？]$/, '') + ' ' + currentSentence;
    } else {
      // 문장 끝에 마침표가 없으면 추가
      if (!sentenceEnders.test(currentSentence.slice(-1))) {
        currentSentence = currentSentence + '.';
      }
      sentences.push(currentSentence);
    }
  }

  console.log('Final sentences:', sentences);
  return sentences;
}

/**
 * 문장 배열을 Sentence 객체 배열로 변환
 */
export function createSentencesFromText(sentences: string[]): Sentence[] {
  return sentences.map((text, index) => ({
    id: `sentence-${index + 1}`,
    text: text,
    isGenerating: false,
    isGenerated: false,
  }));
}

/**
 * 사용자 정의 단어 사전을 localStorage에서 가져오기
 */
export function getUserDictionary(): PronunciationDictionary {
  if (typeof window === 'undefined') return {};
  
  try {
    const saved = localStorage.getItem('tts-user-dictionary');
    return saved ? JSON.parse(saved) : {};
  } catch {
    return {};
  }
}

/**
 * 사용자 정의 단어 사전을 localStorage에 저장
 */
export function saveUserDictionary(dictionary: PronunciationDictionary): void {
  if (typeof window === 'undefined') return;
  
  try {
    localStorage.setItem('tts-user-dictionary', JSON.stringify(dictionary));
  } catch (error) {
    console.error('Failed to save dictionary:', error);
  }
}

/**
 * 사전에 단어 추가
 */
export function addToDictionary(original: string, pronunciation: string): void {
  const dictionary = getUserDictionary();
  dictionary[original] = pronunciation;
  saveUserDictionary(dictionary);
}

/**
 * 사전에서 단어 제거
 */
export function removeFromDictionary(original: string): void {
  const dictionary = getUserDictionary();
  delete dictionary[original];
  saveUserDictionary(dictionary);
}

/**
 * 한글 발음 개선을 위한 텍스트 변환 (DB 기반)
 * 사용자 정의 사전만 적용합니다
 */
export async function improveKoreanPronunciation(
  text: string, 
  userDictionary: PronunciationDictionary = {}
): Promise<string> {
  let improvedText = text;
  
  // 사용자 정의 사전만 적용
  Object.entries(userDictionary).forEach(([original, improved]) => {
    const regex = new RegExp(original, 'g');
    improvedText = improvedText.replace(regex, improved);
  });

  return improvedText;
}

/**
 * 동기 버전 - 클라이언트에서 localStorage 사용
 */
export function improveKoreanPronunciationSync(text: string): string {
  // 사용자 정의 사전 (localStorage)
  const userDictionary = getUserDictionary();

  let improvedText = text;
  
  // 사용자 정의 사전만 적용
  Object.entries(userDictionary).forEach(([original, improved]) => {
    const regex = new RegExp(original, 'g');
    improvedText = improvedText.replace(regex, improved);
  });

  return improvedText;
}

/**
 * 텍스트 길이를 확인하고 경고 메시지를 반환
 */
export function validateTextLength(text: string): { isValid: boolean; message?: string } {
  const maxLength = 10000; // ElevenLabs v2 모델 제한
  
  if (text.length === 0) {
    return { isValid: false, message: '텍스트를 입력해주세요.' };
  }
  
  if (text.length > maxLength) {
    return { 
      isValid: false, 
      message: `텍스트가 너무 깁니다. 최대 ${maxLength}자까지 입력 가능합니다. (현재: ${text.length}자)` 
    };
  }
  
  return { isValid: true };
}

/**
 * 문장에서 특수문자나 불필요한 공백 제거
 */
export function cleanSentence(sentence: string): string {
  return sentence
    .replace(/\s+/g, ' ') // 여러 공백을 하나로
    .replace(/^\s+|\s+$/g, '') // 앞뒤 공백 제거
    .replace(/[""'']/g, '"') // 따옴표 통일
    .trim();
}


/**
 * 텍스트에서 사전에 의해 변경된 단어들을 찾아서 하이라이트 정보 반환
 */
export function getHighlightedText(originalText: string, userDictionary: PronunciationDictionary = {}): Array<{
  text: string;
  isChanged: boolean;
  originalWord?: string;
}> {

  
  // 사용자 사전만 사용
  const combinedMap = userDictionary;

  // 변경할 단어들을 찾아서 정렬 (긴 단어부터)
  const wordsToReplace = Object.keys(combinedMap).sort((a, b) => b.length - a.length);
  
  const parts: Array<{ text: string; isChanged: boolean; originalWord?: string }> = [];
  const currentText = originalText;
  let currentIndex = 0;

  while (currentIndex < currentText.length) {
    let foundMatch = false;
    
    // 현재 위치에서 시작하는 단어가 있는지 확인
    for (const original of wordsToReplace) {
      if (currentText.substr(currentIndex, original.length) === original) {
        // 변경될 단어를 찾음
        parts.push({
          text: combinedMap[original],
          isChanged: true,
          originalWord: original
        });
        currentIndex += original.length;
        foundMatch = true;
        break;
      }
    }
    
    if (!foundMatch) {
      // 일반 문자 추가
      const nextMatchIndex = wordsToReplace.reduce((minIndex, original) => {
        const index = currentText.indexOf(original, currentIndex);
        return index >= 0 && index < minIndex ? index : minIndex;
      }, currentText.length);
      
      const normalText = currentText.substring(currentIndex, nextMatchIndex);
      if (normalText) {
        // 이전 파트가 일반 텍스트면 합치기
        if (parts.length > 0 && !parts[parts.length - 1].isChanged) {
          parts[parts.length - 1].text += normalText;
        } else {
          parts.push({
            text: normalText,
            isChanged: false
          });
        }
      }
      currentIndex = nextMatchIndex;
    }
  }

  return parts.length > 0 ? parts : [{ text: originalText, isChanged: false }];
} 