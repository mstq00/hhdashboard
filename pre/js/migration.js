import { collection, doc, getDocs, serverTimestamp, writeBatch } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

export async function migrateCommissionData() {
    const commissionData = [
        { productName: "높이조절 스윙 탁상 거울", option: "", commissionRates: { smartstore: 4.18, ohouse: 18.00, ytshopping: 2.20 } },
        { productName: "베이직 양념통", option: "", commissionRates: { smartstore: 4.18, ohouse: 14.00, ytshopping: 2.20 } },
        { productName: "베이직 오일병", option: "", commissionRates: { smartstore: 4.18, ohouse: 14.00, ytshopping: 2.20 } },
        { productName: "베이직 멀티 세척볼", option: "", commissionRates: { smartstore: 4.18, ohouse: 14.00, ytshopping: 2.20 } },
        { productName: "베이직 2단 양념통 선반", option: "화이트", commissionRates: { smartstore: 4.18, ohouse: 14.00, ytshopping: 2.20 } },
        { productName: "바나나 멀티 후크", option: "화이트 3개", commissionRates: { smartstore: 4.18, ohouse: 16.00, ytshopping: 2.20 } },
        { productName: "바나나 멀티 후크", option: "화이트 6개", commissionRates: { smartstore: 4.18, ohouse: 16.00, ytshopping: 2.20 } },
        { productName: "너비 높이 조절 적층식 주방 선반", option: "", commissionRates: { smartstore: 4.18, ohouse: 14.00, ytshopping: 2.20 } },
        { productName: "바나나 멀티 후크", option: "그레이 3개", commissionRates: { smartstore: 4.18, ohouse: 16.00, ytshopping: 2.20 } },
        { productName: "바나나 멀티 후크", option: "그레이 6개", commissionRates: { smartstore: 4.18, ohouse: 16.00, ytshopping: 2.20 } },
        { productName: "딱붙는 자석선반", option: "1+1", commissionRates: { smartstore: 4.18, ohouse: 14.00, ytshopping: 2.20 } },
        { productName: "적층식 주방 접시 선반", option: "", commissionRates: { smartstore: 4.18, ohouse: 14.00, ytshopping: 2.20 } },
        { productName: "바나나 멀티 후크", option: "블랙 3개", commissionRates: { smartstore: 4.18, ohouse: 16.00, ytshopping: 2.20 } },
        { productName: "실리콘 드라잉 롤매트", option: "화이트 1개", commissionRates: { smartstore: 4.18, ohouse: 14.00, ytshopping: 2.20 } },
        { productName: "바나나 멀티 후크", option: "블랙 6개", commissionRates: { smartstore: 4.18, ohouse: 16.00, ytshopping: 2.20 } },
        { productName: "김치 커터 밀폐용기", option: "투명", commissionRates: { smartstore: 4.18, ohouse: 14.00, ytshopping: 2.20 } },
        { productName: "베이직 양념통 전용라벨", option: "", commissionRates: { smartstore: 4.18, ohouse: 14.00, ytshopping: 2.20 } },
        { productName: "딱붙는 자석선반", option: "2+2", commissionRates: { smartstore: 4.18, ohouse: 14.00, ytshopping: 2.20 } },
        { productName: "김치 커터 밀폐용기", option: "그레이", commissionRates: { smartstore: 4.18, ohouse: 14.00, ytshopping: 2.20 } },
        { productName: "실리콘 드라잉 롤매트", option: "아이보리 1개", commissionRates: { smartstore: 4.18, ohouse: 14.00, ytshopping: 2.20 } },
        { productName: "베이직 양념통 세트 (8P)", option: "", commissionRates: { smartstore: 4.18, ohouse: 14.00, ytshopping: 2.20 } },
        { productName: "멀티 소스통", option: "단품", commissionRates: { smartstore: 4.18, ohouse: 14.00, ytshopping: 2.20 } },
        { productName: "멀티 소스통", option: "5개", commissionRates: { smartstore: 4.18, ohouse: 14.00, ytshopping: 2.20 } },
        { productName: "멀티 소스통", option: "추가구매", commissionRates: { smartstore: 4.18, ohouse: 14.00, ytshopping: 2.20 } },
        { productName: "올스텐 물빠짐 수세미거치대", option: "일반형", commissionRates: { smartstore: 4.18, ohouse: 14.00, ytshopping: 2.20 } },
        { productName: "올스텐 물빠짐 수세미거치대", option: "와이드형", commissionRates: { smartstore: 4.18, ohouse: 14.00, ytshopping: 2.20 } },
        { productName: "올스텐 물빠짐 수세미거치대", option: "화이트", commissionRates: { smartstore: 4.18, ohouse: 14.00, ytshopping: 2.20 } },
        { productName: "더 촘촘한 스텐링 수세미 (15x15cm)", option: "", commissionRates: { smartstore: 4.18, ohouse: 16.00, ytshopping: 2.20 } },
        { productName: "모던키친타올홀더", option: "사각", commissionRates: { smartstore: 4.18, ohouse: 14.00, ytshopping: 2.20 } },
        { productName: "모던키친타올홀더", option: "반원", commissionRates: { smartstore: 4.18, ohouse: 14.00, ytshopping: 2.20 } },
        { productName: "베이직 양념통 세트", option: "원터치 6개", commissionRates: { smartstore: 4.18, ohouse: 14.00, ytshopping: 2.20 } },
        { productName: "베이직 양념통 세트", option: "혼합형", commissionRates: { smartstore: 4.18, ohouse: 14.00, ytshopping: 2.20 } },
        { productName: "베이직 양념통 세트", option: "베이직 8개", commissionRates: { smartstore: 4.18, ohouse: 14.00, ytshopping: 2.20 } },
        { productName: "베이직 대용량 원터치 양념통", option: "", commissionRates: { smartstore: 4.18, ohouse: 14.00, ytshopping: 2.20 } },
        { productName: "높이조절 스윙 탁상 거울 (B2B)", option: "샹테카이", commissionRates: { smartstore: 2.20, ohouse: 0, ytshopping: 0 } },
        { productName: "멀티 소스통 (L)", option: "5개", commissionRates: { smartstore: 4.18, ohouse: 14.00, ytshopping: 2.20 } },
        { productName: "199 다이얼 타이머", option: "건전지 미포함", commissionRates: { smartstore: 4.18, ohouse: 16.00, ytshopping: 2.20 } },
        { productName: "199 다이얼 타이머", option: "건전지 포함", commissionRates: { smartstore: 4.18, ohouse: 16.00, ytshopping: 2.20 } },
        { productName: "멀티 소스통 (L)", option: "단품", commissionRates: { smartstore: 4.18, ohouse: 14.00, ytshopping: 2.20 } },
        { productName: "멀티 소스통 (L)", option: "추가구매", commissionRates: { smartstore: 4.18, ohouse: 14.00, ytshopping: 2.20 } }
    ];

    try {
        const db = window.firebase.db;
        const collectionRef = collection(db, 'channelCommissions');
        
        // 기존 데이터 삭제
        const snapshot = await getDocs(collectionRef);
        const batch = writeBatch(db);
        
        snapshot.docs.forEach(doc => {
            batch.delete(doc.ref);
        });

        // 새 데이터 추가
        commissionData.forEach(data => {
            const docRef = doc(collectionRef);
            batch.set(docRef, {
                ...data,
                updatedAt: serverTimestamp()
            });
        });

        await batch.commit();
        console.log('마이그레이션 완료');
        alert('채널별 수수료 데이터가 성공적으로 마이그레이션되었습니다.');
    } catch (error) {
        console.error('마이그레이션 실패:', error);
        alert('마이그레이션 중 오류가 발생했습니다.');
        throw error;
    }
} 