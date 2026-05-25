        (async () => {
            const { ai: engineAi, moves: engineMoves, move: engineMove, status: engineStatus } = await import('https://esm.sh/js-chess-engine@2.4.6');

        const boardElement = document.getElementById('board');

        const initialSetup = [
            '♜','♞','♝','♛','♚','♝','♞','♜',
            '♟','♟','♟','♟','♟','♟','♟','♟',
            '','','','','','','','',
            '','','','','','','','',
            '','','','','','','','',
            '','','','','','','','',
            '♙','♙','♙','♙','♙','♙','♙','♙',
            '♖','♘','♗','♕','♔','♗','♘','♖'
        ];

        [...initialSetup].reverse().forEach((_, index) => {
            const squareDiv = document.createElement('div');
            squareDiv.classList.add('square');
            squareDiv.dataset.index = String(index);
            const logicalIndex = initialSetup.length - 1 - index;
            squareDiv.dataset.logicalIndex = String(logicalIndex);

            const row = Math.floor(index / 8);
            const col = index % 8;
            squareDiv.classList.add((row + col) % 2 === 0 ? 'light' : 'dark');

            const logicalRow = Math.floor(logicalIndex / 8);
            const logicalCol = logicalIndex % 8;
            const fileLabel = document.createElement('span');
            fileLabel.className = 'coord-file';
            fileLabel.textContent = String.fromCharCode(97 + logicalCol);
            const rankLabel = document.createElement('span');
            rankLabel.className = 'coord-rank';
            rankLabel.textContent = String(8 - logicalRow);
            squareDiv.appendChild(fileLabel);
            squareDiv.appendChild(rankLabel);

            if ((index + 1) % 8 === 0 && index !== 63) {
                squareDiv.classList.add('row-break');
            }

            boardElement.appendChild(squareDiv);
        });

        const board = document.getElementById('board');
        const boardLoading = document.getElementById('board-loading');
        const gameStatus = document.getElementById('game-status');
        const squares = Array.from(board.querySelectorAll('.square'));
        const squareByLogicalIndex = new Map(
            squares.map((square) => [Number(square.dataset.logicalIndex), square])
        );
        const turnIndicator = document.getElementById('turn-indicator');
        const selectedPieceIndicator = document.getElementById('selected-piece-indicator');
        const sizeSlider = document.getElementById('size-slider');
        const sizeValue = document.getElementById('size-value');
        const fitToScreenButton = document.getElementById('fit-to-screen');
        const fenInput = document.getElementById('fen-input');
        const applyFenButton = document.getElementById('apply-fen');
        const restartGameButton = document.getElementById('restart-game');
        const fenStatus = document.getElementById('fen-status');
        const enableAiCheckbox = document.getElementById('enable-ai-checkbox');
        const aiStatus = document.getElementById('ai-status');
        const aiLevelSelect = document.getElementById('ai-level');
        const playerSideSelect = document.getElementById('player-side');
        const aiSettingsPanel = document.getElementById('ai-settings');
        const showPreviewCheckbox = document.getElementById('show-preview-checkbox');
        const showSelectedCheckbox = document.getElementById('show-selected-checkbox');
        const showNotationsCheckbox = document.getElementById('show-notations-checkbox');
        const previewWrapper = document.getElementById('preview-wrapper');
        const previewBoard = document.getElementById('preview-board');
        const promotionModal = document.getElementById('promotion-modal');
        const promotionOptions = document.getElementById('promotion-options');
        const modeModal = document.getElementById('mode-modal');
        const startVsAiButton = document.getElementById('start-vs-ai');
        const startHumanVsHumanButton = document.getElementById('start-human-vs-human');

        const BOARD_SIZE = 8;
        const DEFAULT_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
        const PROMOTION_MAP = {
            white: { q: '♕', r: '♖', b: '♗', n: '♘' },
            black: { q: '♛', r: '♜', b: '♝', n: '♞' }
        };

        let boardState = [...initialSetup];
        let engineBoard = null;
        let selectedIndex = null;
        let selectedSquare = null;
        let legalMoves = [];
        let currentTurn = 'white';
        let gameOver = false;
        let promotionPending = false;
        let aiThinking = false;
        let aiEnabled = false;
        let aiLevel = 3;
        let playerSide = 'white';
        let aiSide = 'black';
        let previewVisible = false;
        let modeSelectionPending = true;

        const PIECE_TO_FEN = {
            '♙': 'P',
            '♖': 'R',
            '♘': 'N',
            '♗': 'B',
            '♕': 'Q',
            '♔': 'K',
            '♟': 'p',
            '♜': 'r',
            '♞': 'n',
            '♝': 'b',
            '♛': 'q',
            '♚': 'k'
        };

        function getRenderedPieceChar(pieceChar) {
            const filledWhiteMap = {
                '♙': '♟',
                '♖': '♜',
                '♘': '♞',
                '♗': '♝',
                '♕': '♛',
                '♔': '♚'
            };

            return filledWhiteMap[pieceChar] || pieceChar;
        }

        function boardConfigToBoardState(config) {
            const nextBoard = Array(64).fill('');
            const pieces = config && config.pieces ? config.pieces : {};
            Object.entries(pieces).forEach(([square, pieceSymbol]) => {
                const index = notationToLogicalIndex(String(square).toLowerCase());
                if (index !== null) {
                    nextBoard[index] = fenCharToPiece(pieceSymbol) || '';
                }
            });
            return nextBoard;
        }

        function syncFromEngineBoard(config) {
            if (!config) {
                return;
            }
            engineBoard = config;
            boardState = boardConfigToBoardState(config);
            currentTurn = config.turn || currentTurn;
            gameOver = Boolean(config.isFinished);
        }

        function getSideLabel(side) {
            return side === 'white' ? 'White' : 'Black';
        }

        function resolvePlayerSide() {
            const selected = playerSideSelect.value;
            return selected === 'random'
                ? (Math.random() < 0.5 ? 'white' : 'black')
                : selected;
        }

        function applyAiSettings() {
            aiEnabled = enableAiCheckbox.checked;
            playerSide = resolvePlayerSide();
            aiSide = playerSide === 'white' ? 'black' : 'white';
            aiLevel = Number(aiLevelSelect.value);
            if (aiStatus) {
                aiStatus.textContent = aiEnabled
                    ? `You play ${getSideLabel(playerSide)}. AI is ${getSideLabel(aiSide)} (level ${aiLevel}).`
                    : 'AI disabled. You control both sides.';
            }
            updateGameStatus();
        }

        function updateGameStatus() {
            gameStatus.textContent = aiEnabled
                ? `Mode: Human vs AI. You are playing ${getSideLabel(playerSide)}.`
                : 'Mode: Human vs Human. You control both sides.';
        }

        function updateAiSettingsVisibility() {
            aiSettingsPanel.hidden = !enableAiCheckbox.checked;
        }

        function closeModePrompt() {
            modeSelectionPending = false;
            modeModal.classList.remove('open');
            modeModal.setAttribute('aria-hidden', 'true');
            void maybePlayAiTurn();
        }

        function selectGameMode(playVsAi) {
            enableAiCheckbox.checked = playVsAi;
            aiLevelSelect.value = '3';
            playerSideSelect.value = 'white';
            updateAiSettingsVisibility();
            applyAiSettings();
            closeModePrompt();
        }

        function updatePreviewVisibility() {
            previewVisible = showPreviewCheckbox.checked;
            previewWrapper.classList.toggle('visible', previewVisible);
            if (previewVisible) {
                renderPreviewBoard();
            }
        }

        function updateSelectedPanelVisibility() {
            selectedPieceIndicator.style.display = showSelectedCheckbox.checked ? 'flex' : 'none';
        }

        function updateNotationVisibility() {
            document.body.classList.toggle('hide-notations', !showNotationsCheckbox.checked);
        }

        function initializePreviewBoard() {
            previewBoard.innerHTML = '';
            for (let row = 0; row < BOARD_SIZE; row++) {
                for (let col = 0; col < BOARD_SIZE; col++) {
                    const square = document.createElement('div');
                    square.classList.add('preview-square');
                    square.classList.add((row + col) % 2 === 0 ? 'light' : 'dark');
                    const logicalIndex = coordToLogicalIndex(row, col);
                    square.dataset.logicalIndex = String(logicalIndex);

                    // Chess-style preview notation: files on bottom row, ranks on left column.
                    if (row === BOARD_SIZE - 1) {
                        const fileLabel = document.createElement('span');
                        fileLabel.className = 'preview-coord-file';
                        fileLabel.textContent = String.fromCharCode(97 + col);
                        square.appendChild(fileLabel);
                    }

                    if (col === 0) {
                        const rankLabel = document.createElement('span');
                        rankLabel.className = 'preview-coord-rank';
                        rankLabel.textContent = String(8 - row);
                        square.appendChild(rankLabel);
                    }

                    previewBoard.appendChild(square);
                }
            }
        }

        function renderPreviewBoard() {
            const previewSquares = previewBoard.querySelectorAll('.preview-square');
            previewSquares.forEach((square) => {
                const piece = square.querySelector('.preview-piece');
                if (piece) {
                    piece.remove();
                }
            });

            boardState.forEach((pieceChar, logicalIndex) => {
                if (!pieceChar) {
                    return;
                }
                const target = previewBoard.querySelector(`.preview-square[data-logical-index="${logicalIndex}"]`);
                if (!target) {
                    return;
                }
                const piece = createPieceElement(pieceChar);
                piece.classList.add('preview-piece');
                target.appendChild(piece);
            });
        }

        function clearCheckHighlight() {
            squares.forEach((square) => {
                square.classList.remove('checked-king');
            });
        }

        function updateCheckHighlight(inCheck = false) {
            clearCheckHighlight();

            if (!inCheck) {
                return;
            }

            const kingColor = currentTurn;

            const kingIndex = findKingIndex(boardState, kingColor);
            if (kingIndex < 0) {
                return;
            }

            const kingSquare = getSquareAtLogicalIndex(kingIndex);
            if (kingSquare) {
                kingSquare.classList.add('checked-king');
            }
        }

        function getPieceColor(pieceChar) {
            const whitePieces = ['♙', '♖', '♘', '♗', '♕', '♔'];
            const blackPieces = ['♟', '♜', '♞', '♝', '♛', '♚'];
            if (whitePieces.includes(pieceChar)) return 'white';
            if (blackPieces.includes(pieceChar)) return 'black';
            return null;
        }

        function getPieceType(pieceChar) {
            const whiteMap = {
                '♙': 'pawn',
                '♖': 'rook',
                '♘': 'knight',
                '♗': 'bishop',
                '♕': 'queen',
                '♔': 'king'
            };
            const blackMap = {
                '♟': 'pawn',
                '♜': 'rook',
                '♞': 'knight',
                '♝': 'bishop',
                '♛': 'queen',
                '♚': 'king'
            };
            return whiteMap[pieceChar] || blackMap[pieceChar] || null;
        }

        function coordToLogicalIndex(row, col) {
            return row * BOARD_SIZE + col;
        }

        function logicalIndexToCoord(index) {
            return {
                row: Math.floor(index / BOARD_SIZE),
                col: index % BOARD_SIZE
            };
        }

        function getSquareAtLogicalIndex(logicalIndex) {
            return squareByLogicalIndex.get(logicalIndex) || null;
        }

        function getLogicalIndex(square) {
            return Number(square.dataset.logicalIndex);
        }

        function logicalIndexToNotation(index) {
            const { row, col } = logicalIndexToCoord(index);
            const file = String.fromCharCode(97 + col);
            const rank = String(8 - row);
            return `${file}${rank}`;
        }

        function notationToLogicalIndex(notation) {
            const text = notation.trim().toLowerCase();
            if (!/^[a-h][1-8]$/.test(text)) {
                return null;
            }

            const col = text.charCodeAt(0) - 97;
            const rank = Number(text[1]);
            const row = 8 - rank;
            return coordToLogicalIndex(row, col);
        }

        function setFenStatus(message, isError = false) {
            fenStatus.textContent = message;
            fenStatus.classList.toggle('error', isError);
        }

        function fenCharToPiece(char) {
            const map = {
                p: '♟',
                r: '♜',
                n: '♞',
                b: '♝',
                q: '♛',
                k: '♚',
                P: '♙',
                R: '♖',
                N: '♘',
                B: '♗',
                Q: '♕',
                K: '♔'
            };

            return map[char] || null;
        }

        function applyFen(fenText, statusMessage = 'FEN loaded successfully.') {
            const parsed = engineStatus(fenText);
            syncFromEngineBoard(parsed);

            applyAiSettings();

            clearSelection();
            renderBoardPieces();
            evaluateGameState();
            setFenStatus(statusMessage);
            void maybePlayAiTurn();
        }

        function createPieceElement(pieceChar) {
            const pieceSpan = document.createElement('span');
            pieceSpan.classList.add('piece');
            const pieceColor = getPieceColor(pieceChar);
            if (pieceColor === 'white') {
                pieceSpan.classList.add('white-piece');
            } else if (pieceColor === 'black') {
                pieceSpan.classList.add('black-piece');
            }
            pieceSpan.textContent = getRenderedPieceChar(pieceChar);
            return pieceSpan;
        }

        function renderBoardPieces() {
            squares.forEach((square) => {
                const piece = square.querySelector('.piece');
                if (piece) {
                    piece.remove();
                }
            });

            boardState.forEach((pieceChar, logicalIndex) => {
                if (!pieceChar) {
                    return;
                }
                const square = getSquareAtLogicalIndex(logicalIndex);
                if (!square) {
                    return;
                }
                square.appendChild(createPieceElement(pieceChar));
            });

            syncSelectedPieceClass();
            renderPreviewBoard();
        }

        function syncSelectedPieceClass() {
            board.querySelectorAll('.piece.selected').forEach((piece) => {
                piece.classList.remove('selected');
            });

            if (selectedIndex === null) {
                return;
            }

            const selectedSquareEl = getSquareAtLogicalIndex(selectedIndex);
            if (!selectedSquareEl) {
                return;
            }

            const pieceEl = selectedSquareEl.querySelector('.piece');
            if (pieceEl) {
                pieceEl.classList.add('selected');
            }
        }

        function applyBoardSize(squareSizePx) {
            const pieceSizePx = Math.round(squareSizePx * 0.69);
            document.documentElement.style.setProperty('--square-size', `${squareSizePx}px`);
            document.documentElement.style.setProperty('--piece-size', `${pieceSizePx}px`);
            sizeValue.textContent = `${squareSizePx}px`;
        }

        function getLargestFitSize() {
            const wrapperWidth = board.parentElement ? board.parentElement.clientWidth : 0;
            const totalSquares = squares.length || 64;
            const sliderMin = Number(sizeSlider.min) || 24;
            const sliderMax = Number(sizeSlider.max) || 110;
            const rawFit = Math.floor(wrapperWidth / totalSquares);

            return {
                fitSize: Math.min(sliderMax, rawFit),
                sliderMin
            };
        }

        function updateFitToScreenButtonVisibility() {
            if (!fitToScreenButton) {
                return;
            }

            const { fitSize, sliderMin } = getLargestFitSize();
            const shouldShow = fitSize >= Math.max(24, sliderMin);
            fitToScreenButton.hidden = !shouldShow;
        }

        function clearLegalMoveHighlights() {
            legalMoves.forEach((move) => {
                const square = getSquareAtLogicalIndex(move.to);
                if (!square) {
                    return;
                }
                square.classList.remove('legal-move', 'legal-capture');
            });
            legalMoves = [];
        }

        function showLegalMoveHighlights(moves) {
            clearLegalMoveHighlights();
            legalMoves = moves;
            legalMoves.forEach((move) => {
                const square = getSquareAtLogicalIndex(move.to);
                if (!square) {
                    return;
                }
                square.classList.add(move.capture ? 'legal-capture' : 'legal-move');
            });
        }

        function updateSelectedPieceIndicator() {
            if (selectedIndex === null) {
                selectedPieceIndicator.innerHTML = '<span class="label">Selected Piece</span><span class="piece-slot empty">None</span><span class="meta"><span class="notation-label">Square</span><span class="notation-value">-</span></span>';
                return;
            }

            const pieceChar = boardState[selectedIndex];
            const side = getPieceColor(pieceChar);
            if (!pieceChar || !side) {
                selectedPieceIndicator.innerHTML = '<span class="label">Selected Piece</span><span class="piece-slot empty">None</span><span class="meta"><span class="notation-label">Square</span><span class="notation-value">-</span></span>';
                return;
            }

            const notation = logicalIndexToNotation(selectedIndex);
            selectedPieceIndicator.innerHTML = `<span class="label">Selected Piece</span><span class="piece-slot"><span class="piece ${side}-piece">${getRenderedPieceChar(pieceChar)}</span></span><span class="meta"><span class="notation-label">Square</span><span class="notation-value">${notation}</span></span>`;
        }

        function clearSelection() {
            if (selectedSquare) {
                selectedSquare.classList.remove('selected-square');
                selectedSquare = null;
            }
            selectedIndex = null;
            clearLegalMoveHighlights();
            syncSelectedPieceClass();
            updateSelectedPieceIndicator();
        }

        function setSelectedIndex(logicalIndex) {
            clearSelection();
            selectedIndex = logicalIndex;
            selectedSquare = getSquareAtLogicalIndex(logicalIndex);
            if (selectedSquare) {
                selectedSquare.classList.add('selected-square');
            }
            const moves = getLegalMovesForIndex(boardState, logicalIndex);
            showLegalMoveHighlights(moves);
            syncSelectedPieceClass();
            updateSelectedPieceIndicator();
        }

        function findKingIndex(boardSnapshot, color) {
            const kingChar = color === 'white' ? '♔' : '♚';
            return boardSnapshot.findIndex((piece) => piece === kingChar);
        }

        function getEngineMovesMap() {
            try {
                return engineMoves(engineBoard) || {};
            } catch {
                return {};
            }
        }

        function getEngineStatus() {
            try {
                return engineStatus(engineBoard) || null;
            } catch {
                return null;
            }
        }

        function buildEngineMove(boardSnapshot, fromIndex, toIndex) {
            const movingPiece = boardSnapshot[fromIndex];
            if (!movingPiece) {
                return null;
            }

            const movingColor = getPieceColor(movingPiece);
            const movingType = getPieceType(movingPiece);
            const targetPiece = boardSnapshot[toIndex];
            const move = {
                from: fromIndex,
                to: toIndex,
                capture: Boolean(targetPiece)
            };

            const fromCoord = logicalIndexToCoord(fromIndex);
            const toCoord = logicalIndexToCoord(toIndex);

            if (movingType === 'pawn') {
                const promotionRow = movingColor === 'white' ? 0 : 7;
                move.promotion = toCoord.row === promotionRow;

                if (Math.abs(toCoord.row - fromCoord.row) === 2 && fromCoord.col === toCoord.col) {
                    move.doublePawn = true;
                }

                if (fromCoord.col !== toCoord.col && !targetPiece) {
                    const capturedIndex = coordToLogicalIndex(fromCoord.row, toCoord.col);
                    const capturedPiece = boardSnapshot[capturedIndex];
                    if (capturedPiece && getPieceType(capturedPiece) === 'pawn' && getPieceColor(capturedPiece) !== movingColor) {
                        move.capture = true;
                        move.enPassant = true;
                        move.capturedIndex = capturedIndex;
                    }
                }
            }

            if (movingType === 'king' && Math.abs(toCoord.col - fromCoord.col) === 2) {
                const kingSide = toCoord.col > fromCoord.col;
                move.castle = kingSide ? 'king' : 'queen';
                if (movingColor === 'white') {
                    move.rookFrom = kingSide ? 63 : 56;
                    move.rookTo = kingSide ? 61 : 59;
                } else {
                    move.rookFrom = kingSide ? 7 : 0;
                    move.rookTo = kingSide ? 5 : 3;
                }
            }

            return move;
        }

        function getLegalMovesForIndex(boardSnapshot, fromIndex) {
            const piece = boardSnapshot[fromIndex];
            if (!piece) {
                return [];
            }

            const fromNotation = logicalIndexToNotation(fromIndex).toUpperCase();
            const engineMap = getEngineMovesMap();
            const destinations = engineMap[fromNotation] || engineMap[fromNotation.toLowerCase()] || [];

            return destinations
                .map((toNotation) => notationToLogicalIndex(String(toNotation).toLowerCase()))
                .filter((toIndex) => toIndex !== null)
                .map((toIndex) => buildEngineMove(boardSnapshot, fromIndex, toIndex))
                .filter((move) => move !== null);
        }

        function choosePromotionPiece(color) {
            return new Promise((resolve) => {
                promotionPending = true;
                promotionOptions.innerHTML = '';

                const entries = [
                    ['q', 'Queen'],
                    ['r', 'Rook'],
                    ['b', 'Bishop'],
                    ['n', 'Knight']
                ];

                entries.forEach(([key, title]) => {
                    const button = document.createElement('button');
                    button.type = 'button';
                    button.className = 'promotion-option';
                    button.title = title;
                    const piece = createPieceElement(PROMOTION_MAP[color][key]);
                    button.appendChild(piece);
                    button.addEventListener('click', () => {
                        promotionModal.classList.remove('open');
                        promotionModal.setAttribute('aria-hidden', 'true');
                        promotionPending = false;
                        resolve(PROMOTION_MAP[color][key]);
                    });
                    promotionOptions.appendChild(button);
                });

                promotionModal.classList.add('open');
                promotionModal.setAttribute('aria-hidden', 'false');
            });
        }

        function updateTurnIndicator(boardStatus = getEngineStatus()) {
            if (gameOver) {
                return;
            }

            const sideLabel = currentTurn === 'white' ? 'White' : 'Black';
            const inCheck = Boolean(boardStatus && boardStatus.check);
            turnIndicator.textContent = inCheck ? `${sideLabel} to move - Check!` : `${sideLabel} to move`;
        }

        function evaluateGameState() {
            const boardStatus = getEngineStatus();
            const inCheck = Boolean(boardStatus && boardStatus.check);
            const checkMate = Boolean(boardStatus && boardStatus.checkMate);
            const staleMate = Boolean(boardStatus && boardStatus.staleMate);
            const isFinished = Boolean(boardStatus && boardStatus.isFinished);

            if (!checkMate && !staleMate && !isFinished) {
                updateTurnIndicator(boardStatus);
                updateCheckHighlight(inCheck);
                return;
            }

            gameOver = true;
            if (checkMate) {
                const winner = currentTurn === 'white' ? 'Black' : 'White';
                turnIndicator.textContent = `Checkmate! ${winner} wins`;
                updateCheckHighlight(inCheck);
                return;
            }

            turnIndicator.textContent = 'Stalemate!';
            updateCheckHighlight(inCheck);
        }

        async function maybePlayAiTurn() {
            if (!aiEnabled || gameOver || promotionPending || aiThinking || currentTurn !== aiSide) {
                return;
            }

            aiThinking = true;
            const aiLabel = getSideLabel(aiSide);
            turnIndicator.textContent = `${aiLabel} (AI) is thinking...`;

            await new Promise((resolve) => setTimeout(resolve, 50));

            try {
                const result = engineAi(engineBoard, { level: aiLevel });
                const playedMove = result && result.move ? Object.entries(result.move)[0] : null;

                if (!playedMove) {
                    aiThinking = false;
                    evaluateGameState();
                    return;
                }

                let nextBoard = result.board;
                if (!nextBoard) {
                    const [from, to] = playedMove;
                    nextBoard = engineMove(engineBoard, String(from).toUpperCase(), String(to).toUpperCase());
                }

                syncFromEngineBoard(nextBoard);
                clearSelection();
                renderBoardPieces();
                evaluateGameState();
            } catch (error) {
                setFenStatus(`AI error: ${error.message || 'could not produce a move.'}`, true);
            } finally {
                aiThinking = false;
                updateTurnIndicator();
            }
        }

        async function playMove(move, options = {}) {
            if (gameOver) {
                return;
            }

            const movingPiece = boardState[move.from];
            const movingColor = getPieceColor(movingPiece);

            let promotionPiece = null;
            if (move.promotion) {
                if (options.autoPromote) {
                    promotionPiece = movingColor === 'white' ? '♕' : '♛';
                } else {
                    promotionPiece = await choosePromotionPiece(movingColor);
                }
            }

            const fromNotation = logicalIndexToNotation(move.from).toUpperCase();
            const toNotation = logicalIndexToNotation(move.to).toUpperCase();
            let nextBoard = engineMove(engineBoard, fromNotation, toNotation);

            if (move.promotion && promotionPiece) {
                nextBoard = {
                    ...nextBoard,
                    pieces: {
                        ...nextBoard.pieces,
                        [toNotation]: PIECE_TO_FEN[promotionPiece]
                    }
                };
                nextBoard = engineStatus(nextBoard);
            }

            syncFromEngineBoard(nextBoard);

            clearSelection();
            renderBoardPieces();
            evaluateGameState();

            if (!options.fromAi) {
                void maybePlayAiTurn();
            }
        }

        board.addEventListener('click', (e) => {
            if (modeSelectionPending || gameOver || promotionPending || aiThinking || (aiEnabled && currentTurn !== playerSide)) {
                return;
            }

            const targetSquare = e.target.closest('.square');
            if (!targetSquare) {
                return;
            }

            const targetIndex = getLogicalIndex(targetSquare);
            const targetPiece = boardState[targetIndex];
            const targetColor = getPieceColor(targetPiece);

            if (selectedIndex === null) {
                if (targetPiece && targetColor === currentTurn) {
                    setSelectedIndex(targetIndex);
                }
                return;
            }

            if (targetIndex === selectedIndex) {
                clearSelection();
                return;
            }

            if (targetPiece && targetColor === currentTurn) {
                setSelectedIndex(targetIndex);
                return;
            }

            const chosenMove = legalMoves.find((move) => move.to === targetIndex);
            if (!chosenMove) {
                return;
            }

            void playMove(chosenMove);
        });

        sizeSlider.addEventListener('input', (e) => {
            applyBoardSize(Number(e.target.value));
        });
        fitToScreenButton.addEventListener('click', () => {
            const { fitSize, sliderMin } = getLargestFitSize();
            if (fitSize < Math.max(24, sliderMin)) {
                return;
            }

            sizeSlider.value = String(fitSize);
            applyBoardSize(fitSize);
        });
        window.addEventListener('resize', updateFitToScreenButtonVisibility);

        showPreviewCheckbox.addEventListener('change', updatePreviewVisibility);
        showSelectedCheckbox.addEventListener('change', updateSelectedPanelVisibility);
        showNotationsCheckbox.addEventListener('change', updateNotationVisibility);
        enableAiCheckbox.addEventListener('change', () => {
            updateAiSettingsVisibility();
            applyAiSettings();
            clearSelection();
            void maybePlayAiTurn();
        });
        aiLevelSelect.addEventListener('change', () => {
            applyAiSettings();
        });
        playerSideSelect.addEventListener('change', () => {
            applyAiSettings();
            clearSelection();
            void maybePlayAiTurn();
        });
        startVsAiButton.addEventListener('click', () => {
            selectGameMode(true);
        });
        startHumanVsHumanButton.addEventListener('click', () => {
            selectGameMode(false);
        });

        applyFenButton.addEventListener('click', () => {
            try {
                applyFen(fenInput.value);
            } catch (error) {
                setFenStatus(error.message || 'Invalid FEN.', true);
            }
        });

        restartGameButton.addEventListener('click', () => {
            fenInput.value = DEFAULT_FEN;
            try {
                applyFen(DEFAULT_FEN, 'Game restarted with the default FEN.');
            } catch (error) {
                setFenStatus(error.message || 'Invalid FEN.', true);
            }
        });

        fenInput.addEventListener('keydown', (e) => {
            if (e.key !== 'Enter') {
                return;
            }

            e.preventDefault();
            try {
                applyFen(fenInput.value);
            } catch (error) {
                setFenStatus(error.message || 'Invalid FEN.', true);
            }
        });

        applyBoardSize(Number(sizeSlider.value));
        updateFitToScreenButtonVisibility();
        initializePreviewBoard();
        syncFromEngineBoard(engineStatus(DEFAULT_FEN));
        renderBoardPieces();
        updatePreviewVisibility();
        updateSelectedPanelVisibility();
        updateNotationVisibility();
        updateAiSettingsVisibility();
        aiLevelSelect.value = '3';
        playerSideSelect.value = 'white';
        applyAiSettings();
        evaluateGameState();
        updateSelectedPieceIndicator();
        setFenStatus('');
        boardLoading.style.display = 'none';
        })();