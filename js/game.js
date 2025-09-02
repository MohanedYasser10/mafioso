class MafiosaGame {
    constructor() {
        this.players = [];
        this.playerScores = {};
        this.currentPlace = null;
        this.currentCrime = null;
        this.roles = [];
        this.mafioso = null;
        this.currentPlayerIndex = 0;
        this.votes = {};
        this.eliminatedPlayers = [];
        this.currentRound = 1;
        this.maxRounds = 10;
        this.loadSavedPlayers();
        this.setupEventListeners();
        this.setupResetButton();
    }

    setupResetButton() {
        document.getElementById('resetGameBtn').addEventListener('click', () => {
            if (confirm('هل أنت متأكد من إعادة ضبط اللعبة بالكامل؟ سيتم مسح كل البيانات المحفوظة.')) {
                localStorage.clear();
                window.location.reload();
            }
        });
    }

    loadSavedPlayers() {
        const savedPlayers = localStorage.getItem('mafiosaPlayers');
        if (savedPlayers) {
            this.players = JSON.parse(savedPlayers);
            this.playerScores = JSON.parse(localStorage.getItem('mafiosaScores') || '{}');
        }
    }

    savePlayers() {
        localStorage.setItem('mafiosaPlayers', JSON.stringify(this.players));
        localStorage.setItem('mafiosaScores', JSON.stringify(this.playerScores));
    }

    resetAllData() {
        this.players = [];
        this.playerScores = {};
        localStorage.removeItem('mafiosaPlayers');
        localStorage.removeItem('mafiosaScores');
        document.getElementById('playersList').innerHTML = `
            <div class="player-input">
                <input type="text" placeholder="اسم اللاعب" class="player-name">
            </div>
        `;
        this.showScreen('playersScreen');
    }

    setupEventListeners() {
        // شاشة البداية
        document.getElementById('startGameBtn').addEventListener('click', () => {
            if (this.players.length >= 4) {
                this.startGame();
            } else {
                this.showScreen('playersScreen');
            }
        });

        // الشاشات الجديدة
        document.getElementById('showRevealInstructionsBtn').addEventListener('click', () => this.showRevealInstructions());
        document.getElementById('startRevealingBtn').addEventListener('click', () => {
            this.showScreen('roleScreen');
            this.startRoleDistribution();
        });

        // شاشة إدخال الأسماء
        document.getElementById('addPlayerBtn').addEventListener('click', () => this.addPlayerInput());
        document.getElementById('startWithPlayersBtn').addEventListener('click', () => this.startGame());

        // شاشة توزيع الأدوار
        document.getElementById('showRoleBtn').addEventListener('click', () => this.showCurrentPlayerRole());
        document.getElementById('nextPlayerBtn').addEventListener('click', () => this.nextPlayer());

        // شاشة النقاش
        document.getElementById('startVotingBtn').addEventListener('click', () => this.startVoting());
        // شاشة الأدلة
        const nextClueBtn = document.getElementById('nextClueBtn');
        const startDiscussionBtn = document.getElementById('startDiscussionBtn');
        if (nextClueBtn && startDiscussionBtn) {
            nextClueBtn.addEventListener('click', () => this.showNextClue());
            startDiscussionBtn.addEventListener('click', () => this.startDiscussion());
        }

        // شاشة التصويت
        document.getElementById('confirmVoteBtn').addEventListener('click', () => this.confirmVote());

        // شاشة النتيجة
        document.getElementById('nextRoundBtn').addEventListener('click', () => this.startNextRound());
        document.getElementById('showFinalScoreBtn').addEventListener('click', () => this.showFinalScore());
        document.getElementById('playAgainBtn').addEventListener('click', () => this.resetGame());
        document.getElementById('newPlayersBtn').addEventListener('click', () => this.resetAllData());

        // مراقبة إدخال أسماء اللاعبين
        document.getElementById('playersList').addEventListener('input', () => this.validatePlayers());
    }

    showScreen(screenId) {
        document.querySelectorAll('.screen').forEach(screen => screen.classList.remove('active'));
        document.getElementById(screenId).classList.add('active');
    }

    addPlayerInput() {
        const playersList = document.getElementById('playersList');
        const input = document.createElement('div');
        input.className = 'player-input';
        input.innerHTML = '<input type="text" placeholder="اسم اللاعب" class="player-name">';
        playersList.appendChild(input);
        this.validatePlayers();
    }

    validatePlayers() {
        const inputs = document.querySelectorAll('.player-name');
        const startButton = document.getElementById('startWithPlayersBtn');
        let validPlayers = 0;

        inputs.forEach(input => {
            if (input.value.trim().length > 0) validPlayers++;
        });

        startButton.disabled = validPlayers < 4;
    }

    startGame() {
        if (this.players.length === 0) {
            this.players = Array.from(document.querySelectorAll('.player-name'))
                .map(input => input.value.trim())
                .filter(name => name.length > 0);
        }

        if (this.players.length < 4) return;

        // تهيئة النقاط للاعبين الجدد
        this.players.forEach(player => {
            if (!this.playerScores[player]) {
                this.playerScores[player] = 0;
            }
        });

        this.savePlayers();
        this.currentRound = 1;
        // إعادة تهيئة حالة الأدلة للجولة الجديدة
        this.cluesQueue = null;
        this.currentClueIndex = 0;
        this.justAddedClue = false;
        this.selectRandomScenario();
        this.assignRoles();
        this.showCrime();
    }

    selectRandomScenario() {
        const randomPlace = gameData.places[Math.floor(Math.random() * gameData.places.length)];
        this.currentPlace = randomPlace;
        const selectedCrime = randomPlace.crimes[Math.floor(Math.random() * randomPlace.crimes.length)];
        // حفظ كل تفاصيل الجريمة
        this.currentCrime = {
            title: selectedCrime.title,
            scenario: selectedCrime.scenario,
            plan: selectedCrime.plan,
            execution: selectedCrime.execution
        };
    }

    assignRoles() {
        const availableRoles = [...this.currentPlace.roles];
        this.roles = this.players.map(() => {
            const randomIndex = Math.floor(Math.random() * availableRoles.length);
            return availableRoles.splice(randomIndex, 1)[0];
        });

        // اختيار المافيوسوا
        const eligibleIndices = this.roles
            .map((role, index) => role.canBeMafioso ? index : -1)
            .filter(index => index !== -1);
        
        this.mafioso = eligibleIndices[Math.floor(Math.random() * eligibleIndices.length)];
    }

    showCrime() {
        document.getElementById('crimeTitle').textContent = this.currentCrime.title;
        document.getElementById('crimeScenario').textContent = this.currentCrime.scenario;
        document.getElementById('crimeSound').play().catch(() => {});
        this.showScreen('crimeScreen');
    }

    showRevealInstructions() {
        const playerOrder = document.getElementById('playerOrder');
        playerOrder.innerHTML = this.players.map((player, index) => `
            <div class="player-order-item">
                <span class="player-order-number">${index + 1}</span>
                <span class="player-name">${player}</span>
            </div>
        `).join('');
        this.showScreen('revealInstructionsScreen');
    }

    startRoleDistribution() {
        this.currentPlayerIndex = 0;
        this.updateCurrentPlayerIndicator();
        this.resetRoleScreen();
    }

    resetRoleScreen() {
        const roleReveal = document.getElementById('roleReveal');
        const showRoleBtn = document.getElementById('showRoleBtn');
        const nextPlayerBtn = document.getElementById('nextPlayerBtn');
        const mafiosaSecret = document.getElementById('mafiosaSecret');

        roleReveal.classList.add('hidden');
        showRoleBtn.classList.remove('hidden');
        nextPlayerBtn.classList.add('hidden');
        mafiosaSecret.classList.add('hidden');
    }

    showCurrentPlayerRole() {
        const roleReveal = document.getElementById('roleReveal');
        const showRoleBtn = document.getElementById('showRoleBtn');
        const nextPlayerBtn = document.getElementById('nextPlayerBtn');
        const mafiosaSecret = document.getElementById('mafiosaSecret');

        roleReveal.classList.remove('hidden');
        showRoleBtn.classList.add('hidden');
        nextPlayerBtn.classList.remove('hidden');

        const playerRole = document.getElementById('playerRole');
        const isMafioso = this.currentPlayerIndex === this.mafioso;
        
        playerRole.innerHTML = `
            <span class="player-role-name">دور: ${this.players[this.currentPlayerIndex]}</span>
            <span class="role-title">أنت ${this.roles[this.currentPlayerIndex].name}</span>
            <div class="reveal-instruction">قم بإعلان دورك للآخرين: "${this.roles[this.currentPlayerIndex].name}"</div>
            ${isMafioso ? '<div class="secret-instruction">(لا تكشف أنك المافيوسوا!)</div>' : ''}`;

        if (isMafioso) {
            mafiosaSecret.classList.remove('hidden');
        } else {
            mafiosaSecret.classList.add('hidden');
        }
    }

    updateCurrentPlayerIndicator() {
        const playerIndicator = document.getElementById('currentPlayer');
        playerIndicator.textContent = `دور: ${this.players[this.currentPlayerIndex]}`;
    }

    nextPlayer() {
        this.currentPlayerIndex++;
        if (this.currentPlayerIndex >= this.players.length) {
            this.startCluesPhase();
            return;
        }

        document.getElementById('roleReveal').classList.add('hidden');
        document.getElementById('showRoleBtn').classList.remove('hidden');
        document.getElementById('nextPlayerBtn').classList.add('hidden');
        this.updateCurrentPlayerIndicator();
    }

    startDiscussion() {
        this.showScreen('discussionScreen');
        let timeLeft = 180; // 3 دقائق
        const timerElement = document.getElementById('timer');

        const timer = setInterval(() => {
            timeLeft--;
            const minutes = Math.floor(timeLeft / 60);
            const seconds = timeLeft % 60;
            timerElement.textContent = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

            if (timeLeft <= 0) {
                clearInterval(timer);
                document.getElementById('startVotingBtn').disabled = false;
            }
        }, 1000);
    }

    // مرحلة عرض الأدلة قبل النقاش
    startCluesPhase() {
        // عند العودة بعد الإخراج لا نعيد التهيئة إن كانت الأدلة موجودة
        if (!this.cluesQueue) {
            this.cluesQueue = this.getCluesForCurrentCrime();
        }
        if (typeof this.currentClueIndex !== 'number') {
            this.currentClueIndex = 0;
        }
        this.justAddedClue = false;
        this.updateCluesScreen();
        this.showScreen('cluesScreen');
    }

    getCluesForCurrentCrime() {
        const currentPlace = gameData.places.find(place => place.name === this.currentPlace.name);
        const currentCrime = currentPlace.crimes.find(crime => crime.title === this.currentCrime.title);

        const crimeClues = (currentCrime && currentCrime.clues) ? currentCrime.clues : [];
        const placeClues = (currentPlace && currentPlace.cluePool) ? currentPlace.cluePool : [];

        // مزيج ذكي: نعطي أولوية لأدلة الجريمة ثم نكمل بأدلة المكان، مع إزالة التكرار
        const combined = [];
        const seen = new Set();
        [...crimeClues, ...this.shuffleArray(placeClues)].forEach(c => {
            if (!seen.has(c)) {
                combined.push(c);
                seen.add(c);
            }
        });

        if (combined.length > 0) {
            return combined.slice(0, 3);
        }

        // توليد بديل إن لم توجد أي أدلة
        const generated = [];
        if (this.currentCrime.scenario) generated.push(`من سيناريو الجريمة: ${this.currentCrime.scenario.split('،')[0]}...`);
        if (this.currentCrime.plan) generated.push(`الخطة تشير إلى: ${this.currentCrime.plan.split('،')[0]}...`);
        if (this.currentCrime.execution) generated.push(`طريقة التنفيذ: ${this.currentCrime.execution.split('،')[0]}...`);
        return generated.slice(0, 3);
    }

    // خلط بسيط لمصفوفة الأدلة الخاصة بالمكان لتنوع العرض
    shuffleArray(array) {
        const arr = array.slice();
        for (let i = arr.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [arr[i], arr[j]] = [arr[j], arr[i]];
        }
        return arr;
    }

    updateCluesScreen() {
        const clueText = document.getElementById('clueText');
        const nextClueBtn = document.getElementById('nextClueBtn');
        const startDiscussionBtn = document.getElementById('startDiscussionBtn');

        if (!this.cluesQueue || this.cluesQueue.length === 0) {
            clueText.textContent = 'لا توجد أدلة متاحة، ابدأوا النقاش مباشرةً.';
            nextClueBtn.classList.add('hidden');
            startDiscussionBtn.classList.remove('hidden');
            return;
        }

        // عرض جميع الأدلة من الأول حتى الحالي (تكديس الأدلة)
        const visibleClues = this.cluesQueue.slice(0, this.currentClueIndex + 1);
        clueText.innerHTML = visibleClues
            .map((c, i) => `<div class="clue-item${this.justAddedClue && i === visibleClues.length - 1 ? ' new-clue' : ''}"><span class="clue-index">${i + 1}.</span> ${c}</div>`) 
            .join('');

        const hasMore = this.currentClueIndex < this.cluesQueue.length - 1;
        nextClueBtn.classList.toggle('hidden', !hasMore);
        startDiscussionBtn.classList.toggle('hidden', hasMore);
    }

    showNextClue() {
        if (this.currentClueIndex < this.cluesQueue.length - 1) {
            this.currentClueIndex++;
            this.justAddedClue = true;
            this.updateCluesScreen();
            // إطفاء التمييز بعد التحديث حتى لا يتكرر عند إعادة الرسم
            this.justAddedClue = false;
        }
    }

    startVoting() {
        this.showScreen('votingScreen');
        this.currentPlayerIndex = 0;
        this.votes = {};
        this.updateVotingScreen();
    }

    updateVotingScreen() {
        const votingPlayer = document.getElementById('votingPlayer');
        const votingOptions = document.getElementById('votingOptions');
        
        votingPlayer.textContent = `دور: ${this.players[this.currentPlayerIndex]}`;
        votingOptions.innerHTML = '';

        const livingPlayers = this.players.filter((_, index) => !this.eliminatedPlayers.includes(index));
        livingPlayers.forEach(player => {
            if (player !== this.players[this.currentPlayerIndex]) {
                const option = document.createElement('div');
                option.className = 'voting-option';
                option.textContent = player;
                option.addEventListener('click', () => this.selectVote(option, player));
                votingOptions.appendChild(option);
            }
        });
    }

    selectVote(optionElement, votedPlayer) {
        document.querySelectorAll('.voting-option').forEach(opt => opt.classList.remove('selected'));
        optionElement.classList.add('selected');
        this.votes[this.currentPlayerIndex] = this.players.indexOf(votedPlayer);
    }

    confirmVote() {
        if (!this.votes.hasOwnProperty(this.currentPlayerIndex)) return;

        this.currentPlayerIndex++;
        const livingPlayers = this.players.filter((_, index) => !this.eliminatedPlayers.includes(index));

        if (this.currentPlayerIndex >= this.players.length || 
            livingPlayers.length <= this.eliminatedPlayers.length + 1) {
            this.processVotes();
        } else {
            this.updateVotingScreen();
        }
    }

    processVotes() {
        const voteCounts = {};
        Object.values(this.votes).forEach(votedIndex => {
            voteCounts[votedIndex] = (voteCounts[votedIndex] || 0) + 1;
        });

        const eliminatedIndex = parseInt(Object.entries(voteCounts)
            .reduce((a, b) => (a[1] > b[1] ? a : b))[0]);

        this.eliminatedPlayers.push(eliminatedIndex);
        this.showEliminationScreen(eliminatedIndex);
    }

    showEliminationScreen(eliminatedIndex) {
        const eliminatedPlayer = this.players[eliminatedIndex];
        const wasInnocent = eliminatedIndex !== this.mafioso;
        const announcement = document.getElementById('eliminatedPlayerAnnouncement');
        const roleReveal = document.getElementById('eliminatedPlayerRole');

        announcement.textContent = `تم إخراج: ${eliminatedPlayer}`;
        roleReveal.textContent = `الدور: ${this.roles[eliminatedIndex].name}${eliminatedIndex === this.mafioso ? ' (المافيوسوا)' : ' (بريء)'}`;
        
        document.getElementById('continueAfterEliminationBtn').addEventListener('click', () => {
            if (eliminatedIndex === this.mafioso) {
                this.endGame(true);
            } else if (this.players.length - this.eliminatedPlayers.length <= 2) {
                this.endGame(false);
            } else {
                this.startCluesPhase();
            }
        }, { once: true });

        this.showScreen('eliminationScreen');
    }

    endGame(innocentsWin) {
        const gameResult = document.getElementById('gameResult');
        const rolesReveal = document.getElementById('rolesReveal');
        const roundScore = document.getElementById('roundScore');
        const crimePlan = document.getElementById('crimePlan');
        const crimeExecution = document.getElementById('crimeExecution');

        if (innocentsWin) {
            gameResult.textContent = "الأبرياء فازوا! 🎉";
            document.getElementById('victorySound').play().catch(() => {});
            // إضافة نقاط للأبرياء
            this.players.forEach((player, index) => {
                if (index !== this.mafioso) {
                    this.playerScores[player] += 2;
                }
            });
        } else {
            gameResult.textContent = "المافيوسوا فاز! 👹";
            // إضافة نقاط للمافيوسوا
            this.playerScores[this.players[this.mafioso]] += 5;
        }

        rolesReveal.innerHTML = this.players.map((player, index) => `
            <div class="role-item ${index === this.mafioso ? 'mafioso' : ''}">
                <span class="player-role-name">دور: ${player}</span>
                <span class="role-title">${this.roles[index].name}${index === this.mafioso ? ' (المافيوسوا)' : ''}</span>
            </div>
        `).join('');

        // عرض تفاصيل تنفيذ الجريمة
        const currentPlace = gameData.places.find(place => place.name === this.currentPlace.name);
        const currentCrime = currentPlace.crimes.find(crime => crime.title === this.currentCrime.title);

        // تحديث عرض التفاصيل
        crimePlan.innerHTML = `
            <h4>خطة الجريمة:</h4>
            <p>${currentCrime.plan || 'لم يتم العثور على تفاصيل الخطة.'}</p>
        `;
        
        crimeExecution.innerHTML = `
            <h4>كيف تم التنفيذ:</h4>
            <p>${currentCrime.execution || 'لم يتم العثور على تفاصيل التنفيذ.'}</p>
        `;

        roundScore.innerHTML = `
            <div>الجولة ${this.currentRound} من ${this.maxRounds}</div>
            <div class="current-scores">
                ${this.players.map(player => `
                    <div class="score-item">
                        <span class="player-name">${player}</span>
                        <span class="score">${this.playerScores[player]} نقطة</span>
                    </div>
                `).join('')}
            </div>
        `;

        this.savePlayers();
        this.showScreen('resultScreen');

        // إخفاء/إظهار الأزرار المناسبة
        document.getElementById('nextRoundBtn').style.display = 
            this.currentRound < this.maxRounds ? 'inline-block' : 'none';
        document.getElementById('showFinalScoreBtn').style.display = 
            this.currentRound >= this.maxRounds ? 'inline-block' : 'none';
    }

    startNextRound() {
        this.currentRound++;
        // إعادة تهيئة حالة الأدلة للجولة التالية
        this.cluesQueue = null;
        this.currentClueIndex = 0;
        this.justAddedClue = false;
        this.selectRandomScenario();
        this.assignRoles();
        this.eliminatedPlayers = [];
        this.showCrime();
    }

    showFinalScore() {
        const finalScoreBoard = document.getElementById('finalScoreBoard');
        const winner = document.getElementById('winner');

        // ترتيب اللاعبين حسب النقاط
        const sortedPlayers = [...this.players].sort((a, b) => 
            this.playerScores[b] - this.playerScores[a]
        );

        finalScoreBoard.innerHTML = sortedPlayers.map((player, index) => `
            <div class="score-item ${index === 0 ? 'winner' : ''}">
                <span class="player-name">${player}</span>
                <span class="score">${this.playerScores[player]} نقطة</span>
            </div>
        `).join('');

        winner.textContent = `الفائز: ${sortedPlayers[0]} 🏆`;
        this.showScreen('finalScoreScreen');
    }

    resetGame() {
        // إعادة تعيين كل شيء ما عدا أسماء اللاعبين ونقاطهم
        this.currentPlace = null;
        this.currentCrime = null;
        this.roles = [];
        this.mafioso = null;
        this.currentPlayerIndex = 0;
        this.votes = {};
        this.eliminatedPlayers = [];
        this.currentRound = 1;
        // مسح حالة الأدلة بالكامل
        this.cluesQueue = null;
        this.currentClueIndex = 0;
        this.justAddedClue = false;

        this.showScreen('startScreen');
    }
}

// بدء اللعبة
new MafiosaGame();
