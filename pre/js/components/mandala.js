export class MandalaChart {
    constructor() {
        this.cells = {};
        this.initialize();
    }

    initialize() {
        this.loadMandalaData();
        this.setupEventListeners();
    }

    async loadMandalaData() {
        try {
            const snapshot = await firebase.firestore()
                .collection("mandala")
                .get();
            
            snapshot.forEach(doc => {
                const data = doc.data();
                const cell = document.getElementById(doc.id);
                if (cell) {
                    cell.textContent = data.content;
                    if (data.completed) {
                        cell.classList.add('completed');
                    }
                }
            });
        } catch (error) {
            console.error("만다라트 데이터 로드 중 오류:", error);
        }
    }

    setupEventListeners() {
        document.querySelectorAll('.mandala-cell').forEach(cell => {
            cell.addEventListener('input', () => this.handleCellInput(cell));
            cell.addEventListener('blur', () => this.saveCellContent(cell));
            cell.addEventListener('keydown', (e) => this.handleKeyPress(e, cell));
        });

        document.getElementById('save-mandala').addEventListener('click', 
            () => this.saveAllCells());
    }

    handleCellInput(cell) {
        this.cells[cell.id] = {
            content: cell.textContent,
            completed: cell.classList.contains('completed')
        };
    }

    async saveCellContent(cell) {
        try {
            await firebase.firestore().collection("mandala")
                .doc(cell.id)
                .set({
                    content: cell.textContent,
                    completed: cell.classList.contains('completed')
                });
        } catch (error) {
            console.error("셀 저장 중 오류:", error);
        }
    }

    handleKeyPress(event, cell) {
        if (event.key === 'Enter') {
            event.preventDefault();
            cell.blur();
        }
    }

    async saveAllCells() {
        try {
            const batch = firebase.firestore().batch();
            
            Object.entries(this.cells).forEach(([cellId, data]) => {
                const cellRef = firebase.firestore().collection("mandala").doc(cellId);
                batch.set(cellRef, data);
            });

            await batch.commit();
            alert('만다라트가 저장되었습니다.');
        } catch (error) {
            console.error("만다라트 저장 중 오류:", error);
            alert('저장 중 오류가 발생했습니다.');
        }
    }

    toggleCellCompletion(cell) {
        cell.classList.toggle('completed');
        this.handleCellInput(cell);
        this.saveCellContent(cell);
    }
} 