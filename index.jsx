import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  ChevronLeft, 
  ChevronRight, 
  Image as ImageIcon, 
  Eye, 
  EyeOff,
  Pencil, 
  Slash, 
  Eraser, 
  Undo, 
  Redo, 
  Trash2, 
  Bookmark, 
  List, 
  X,
  CheckCircle,
  XCircle
} from 'lucide-react';

// --- Configuration & Mock Data ---
const TOTAL_QUESTIONS = 50;
const TIME_LIMIT_MINUTES = 60;

// Correct answers mock data
const CORRECT_ANSWERS = Array.from({ length: TOTAL_QUESTIONS }, (_, i) => {
    const id = i + 1;
    const isMultipleChoice = [11, 12, 13, 50].includes(id);
    if (isMultipleChoice) {
        return (id % 4); 
    } else {
        return "サンプル解答";
    }
});

// Question Configuration
const QUESTION_CONFIG = Array.from({ length: TOTAL_QUESTIONS }, (_, i) => {
    const id = i + 1;
    const isMultipleChoice = [11, 12, 13, 50].includes(id); 
    return {
        id: id,
        imagePath: `riddle1/riddle1_${String(id).padStart(2, '0')}.jfjf`,
        points: 2,
        type: isMultipleChoice ? 'choice' : 'text',
        options: isMultipleChoice ? ['イモ', 'チゲ', 'ツル', 'ユキ'] : [],
        correctAnswer: CORRECT_ANSWERS[i]
    };
});

// --- Common Components ---

const ConfirmationModal = ({ isOpen, message, onConfirm, onCancel }) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="bg-white rounded-lg shadow-xl p-6 max-w-sm w-full border-2 border-red-600">
                <h3 className="text-lg font-bold mb-4 text-gray-800">確認</h3>
                <p className="text-gray-600 mb-6">{message}</p>
                <div className="flex justify-end space-x-3">
                    <button 
                        onClick={onCancel}
                        className="px-4 py-2 border border-gray-300 rounded text-gray-600 hover:bg-gray-100 font-bold"
                    >
                        キャンセル
                    </button>
                    <button 
                        onClick={onConfirm}
                        className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 font-bold"
                    >
                        OK
                    </button>
                </div>
            </div>
        </div>
    );
};

// 1. Start Screen
const StartScreen = ({ onStart }) => {
    const [handleName, setHandleName] = useState("");
    
    return (
        <div className="flex flex-col items-center justify-center h-full bg-white p-4 font-sans overflow-y-auto">
            <div className="max-w-4xl w-full bg-white p-8 space-y-8">
                {/* Header Title */}
                <div className="border-b-2 border-red-600 pb-4 mb-8 flex justify-between items-end">
                    <h1 className="text-3xl font-bold text-red-600">謎検もどき</h1>
                    <div className="text-sm text-gray-500">ハンドルネーム: {handleName || "未入力"}</div>
                </div>

                <div className="space-y-6">
                    <div className="bg-gray-50 p-6 rounded border border-gray-200">
                        <label className="block text-gray-700 font-bold mb-2">ハンドルネーム (受検番号)</label>
                        <input 
                            type="text" 
                            className="w-full border-2 border-gray-300 p-3 rounded focus:outline-none focus:border-red-500 text-lg"
                            placeholder="ここに入力してください"
                            value={handleName}
                            onChange={(e) => setHandleName(e.target.value)}
                        />
                    </div>

                    <div className="bg-gray-50 p-6 rounded border border-gray-200">
                        <label className="block text-gray-700 font-bold mb-4">問題セット選択</label>
                        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                            <button className="bg-red-50 border-2 border-red-500 text-red-700 font-bold py-3 px-4 rounded shadow-sm">
                                riddle1
                            </button>
                            {[2,3,4,5,6,7,8,9,10].map(num => (
                                <button key={num} disabled className="bg-gray-200 text-gray-400 font-bold py-3 px-4 rounded cursor-not-allowed">
                                    riddle{num}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="flex justify-center mt-12">
                    <button 
                        onClick={() => handleName && onStart(handleName)}
                        disabled={!handleName}
                        className={`text-white font-bold text-xl py-4 px-12 rounded shadow-lg transition-all ${handleName ? 'bg-red-600 hover:bg-red-700' : 'bg-gray-400 cursor-not-allowed'}`}
                    >
                        模試を受ける
                    </button>
                </div>
                
                <div className="text-center text-xs text-red-500 mt-4">
                    ※ハンドルネームを入力すると開始ボタンが押せるようになります。
                </div>
            </div>
        </div>
    );
};

// 2. Main Exam Screen
const ExamScreen = ({ userName, onFinish }) => {
    // State
    const [currentQIndex, setCurrentQIndex] = useState(0);
    const [answers, setAnswers] = useState({}); 
    const [lockedAnswers, setLockedAnswers] = useState({}); 
    const [bookmarks, setBookmarks] = useState({}); 
    const [timeLeft, setTimeLeft] = useState(TIME_LIMIT_MINUTES * 60);
    const [isMenuOpen, setIsMenuOpen] = useState(false); 
    
    // Drawing State
    const [drawings, setDrawings] = useState({});
    const [redoStack, setRedoStack] = useState({}); 

    // Tool State
    const [tool, setTool] = useState('pencil'); 
    const [color, setColor] = useState('black'); 
    const [isToolbarVisible, setIsToolbarVisible] = useState(true); 

    // Modal State
    const [modalConfig, setModalConfig] = useState({ isOpen: false, message: '', onConfirm: () => {} });

    // Refs for scrolling
    const itemRefs = useRef({});
    const listContainerRef = useRef(null);

    // Timer Logic
    useEffect(() => {
        const timer = setInterval(() => {
            setTimeLeft(prev => {
                if (prev <= 0) {
                    clearInterval(timer);
                    onFinish(answers); 
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
        return () => clearInterval(timer);
    }, [answers, onFinish]); 

    // Scroll to current question logic
    useEffect(() => {
        const currentId = QUESTION_CONFIG[currentQIndex].id;
        const element = itemRefs.current[currentId];
        if (element) {
            // "block: 'start'" aligns the element to the top of the visible area
            element.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    }, [currentQIndex]);


    const formatTime = (seconds) => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    };

    const currentQ = QUESTION_CONFIG[currentQIndex];

    // --- Handlers ---
    const handleAnswerChange = (val) => {
        if (lockedAnswers[currentQ.id]) return;
        setAnswers(prev => ({ ...prev, [currentQ.id]: val }));
    };

    const submitAnswer = () => {
        // Lock the answer
        setLockedAnswers(prev => ({ ...prev, [currentQ.id]: true }));
        
        // Auto navigate to next question
        setTimeout(() => {
            if (currentQIndex === TOTAL_QUESTIONS - 1) {
                // If last question, go to first
                setCurrentQIndex(0);
            } else {
                // Next question
                setCurrentQIndex(prev => prev + 1);
            }
        }, 300); 
    };

    const resetAnswer = () => {
        setLockedAnswers(prev => {
            const next = { ...prev };
            delete next[currentQ.id];
            return next;
        });
    };

    const toggleBookmark = (id) => {
        setBookmarks(prev => ({ ...prev, [id]: !prev[id] }));
    };

    const navigate = (direction) => {
        if (direction === 'prev' && currentQIndex > 0) setCurrentQIndex(curr => curr - 1);
        if (direction === 'next' && currentQIndex < TOTAL_QUESTIONS - 1) setCurrentQIndex(curr => curr + 1);
    };

    const confirmAction = (message, action) => {
        setModalConfig({
            isOpen: true,
            message,
            onConfirm: () => {
                action();
                setModalConfig(prev => ({ ...prev, isOpen: false }));
            }
        });
    };

    const handleFinish = () => {
        onFinish(answers);
    };

    // Keyboard Nav
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.target.tagName === 'INPUT') return; 
            if (e.key === 'ArrowLeft') navigate('prev');
            if (e.key === 'ArrowRight') navigate('next');
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [currentQIndex]);


    // --- Canvas Component ---
    const CanvasLayer = () => {
        const canvasRef = useRef(null);
        const [isDrawing, setIsDrawing] = useState(false);
        const [currentStroke, setCurrentStroke] = useState([]);
        const containerRef = useRef(null);

        useEffect(() => {
            const canvas = canvasRef.current;
            const container = containerRef.current;
            if (!canvas || !container) return;

            const updateSize = () => {
                canvas.width = container.clientWidth;
                canvas.height = container.clientHeight;
                renderCanvas(); 
            };
            
            updateSize();
            window.addEventListener('resize', updateSize);
            return () => window.removeEventListener('resize', updateSize);
        }, [currentQIndex]); 

        const renderCanvas = () => {
            const canvas = canvasRef.current;
            if (!canvas) return;
            const ctx = canvas.getContext('2d');
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            const strokes = drawings[currentQ.id] || [];
            
            [...strokes, ...(isDrawing ? [{ tool, color, points: currentStroke }] : [])].forEach(stroke => {
                if (stroke.points.length < 1) return;
                
                ctx.beginPath();
                ctx.lineCap = 'round';
                ctx.lineJoin = 'round';
                
                if (stroke.tool === 'eraser') {
                    ctx.globalCompositeOperation = 'destination-out';
                    ctx.lineWidth = 20;
                } else {
                    ctx.globalCompositeOperation = 'source-over';
                    ctx.lineWidth = 3;
                    ctx.strokeStyle = stroke.color === 'black' ? '#000' : stroke.color === 'red' ? '#ff0000' : '#0000ff';
                }

                if (stroke.tool === 'line' && stroke.points.length > 1) {
                    const start = stroke.points[0];
                    const end = stroke.points[stroke.points.length - 1];
                    ctx.moveTo(start.x, start.y);
                    ctx.lineTo(end.x, end.y);
                } else {
                    ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
                    for (let i = 1; i < stroke.points.length; i++) {
                        ctx.lineTo(stroke.points[i].x, stroke.points[i].y);
                    }
                }
                ctx.stroke();
            });
            ctx.globalCompositeOperation = 'source-over';
        };

        useEffect(() => {
            renderCanvas();
        }, [drawings, currentQIndex, isDrawing, currentStroke]);

        const getPos = (e) => {
            const rect = canvasRef.current.getBoundingClientRect();
            const clientX = e.touches ? e.touches[0].clientX : e.clientX;
            const clientY = e.touches ? e.touches[0].clientY : e.clientY;
            return { x: clientX - rect.left, y: clientY - rect.top };
        };

        const startDraw = (e) => {
            setIsDrawing(true);
            setCurrentStroke([getPos(e)]);
        };

        const moveDraw = (e) => {
            if (!isDrawing) return;
            const pos = getPos(e);
            setCurrentStroke(prev => [...prev, pos]);
        };

        const endDraw = () => {
            if (!isDrawing) return;
            setIsDrawing(false);
            
            if (currentStroke.length > 0) {
                const newStroke = { tool, color, points: currentStroke };
                setDrawings(prev => {
                    const qDrawings = prev[currentQ.id] || [];
                    return { ...prev, [currentQ.id]: [...qDrawings, newStroke] };
                });
                setRedoStack(prev => {
                    const next = { ...prev };
                    delete next[currentQ.id];
                    return next;
                });
            }
            setCurrentStroke([]);
        };

        return (
            <div ref={containerRef} className={`absolute inset-0 w-full h-full z-10 touch-none pointer-events-auto ${!isToolbarVisible ? 'pointer-events-none' : ''}`}>
                <canvas 
                    ref={canvasRef}
                    onMouseDown={startDraw}
                    onMouseMove={moveDraw}
                    onMouseUp={endDraw}
                    onMouseLeave={endDraw}
                    onTouchStart={startDraw}
                    onTouchMove={moveDraw}
                    onTouchEnd={endDraw}
                    className={`w-full h-full ${tool === 'eraser' ? 'cursor-cell' : 'cursor-crosshair'}`}
                />
            </div>
        );
    };

    // Canvas Toolbar Logic
    const undo = () => {
        setDrawings(prev => {
            const qDrawings = prev[currentQ.id] || [];
            if (qDrawings.length === 0) return prev;
            
            const last = qDrawings[qDrawings.length - 1];
            const remaining = qDrawings.slice(0, -1);
            setRedoStack(rPrev => ({
                ...rPrev,
                [currentQ.id]: [...(rPrev[currentQ.id] || []), last]
            }));
            return { ...prev, [currentQ.id]: remaining };
        });
    };

    const redo = () => {
        setRedoStack(prev => {
            const qRedos = prev[currentQ.id] || [];
            if (qRedos.length === 0) return prev;
            
            const toRestore = qRedos[qRedos.length - 1];
            const remaining = qRedos.slice(0, -1);
            setDrawings(dPrev => ({
                ...dPrev,
                [currentQ.id]: [...(dPrev[currentQ.id] || []), toRestore]
            }));
            return { ...prev, [currentQ.id]: remaining };
        });
    };

    const clearAll = () => {
        confirmAction('書き込んだ線をすべて消しますか？', () => {
                setDrawings(prev => ({ ...prev, [currentQ.id]: [] }));
                setRedoStack(prev => {
                const next = {...prev};
                delete next[currentQ.id];
                return next;
                });
        });
    };

    const handleImageError = (e) => {
        e.target.style.display = 'none';
        if(e.target.nextSibling) {
            e.target.nextSibling.style.display = 'flex';
        }
    };

    return (
        <div className="flex flex-col h-full bg-gray-200 font-sans">
            <ConfirmationModal 
                isOpen={modalConfig.isOpen}
                message={modalConfig.message}
                onConfirm={modalConfig.onConfirm}
                onCancel={() => setModalConfig(prev => ({ ...prev, isOpen: false }))}
            />

            {/* Header */}
            <div className="bg-white border-b border-red-500 h-14 flex items-center justify-between px-4 shrink-0 z-20">
                <div className="flex items-center space-x-4">
                    <h1 className="text-xl font-bold text-red-600 tracking-tighter hidden sm:block">謎検</h1>
                    <div className="text-xs text-gray-500 hidden md:block">受検番号: {userName}</div>
                    <button 
                        onClick={() => confirmAction('受検を終了しますか？(後戻りできません)', handleFinish)}
                        className="border border-gray-400 text-gray-700 px-3 py-1 text-xs hover:bg-gray-100"
                    >
                        受検を終了する &gt;
                    </button>
                </div>
                <div className="flex items-end">
                    <span className="text-sm text-gray-600 mr-1 mb-1">残り</span>
                    <span className="text-3xl font-mono text-gray-800 leading-none">{formatTime(timeLeft)}</span>
                </div>
            </div>

            {/* Main Layout - Fixed to be one screen height */}
            <div className="flex flex-1 overflow-hidden relative">
                
                {/* Center Area (Problem + Controls) - Fixed Left Side */}
                <div className="flex-1 flex flex-col relative z-0 h-full overflow-hidden">
                    
                    {/* Problem Display Area - Takes remaining height */}
                    <div className="flex-1 bg-gray-100 flex items-center justify-center p-2 md:p-4 overflow-hidden relative">
                        {/* Container for Image & Canvas - Constrained to prevent scrolling */}
                        <div className="w-full h-full max-w-5xl relative flex items-center justify-center">
                            
                            {/* Navigation Arrows */}
                            {currentQIndex > 0 && (
                                <button onClick={() => navigate('prev')} className="absolute left-0 top-1/2 -translate-y-1/2 z-30 bg-white/50 hover:bg-white rounded-full p-2 text-gray-600 shadow-lg transform -translate-x-1/2 md:translate-x-0">
                                    <ChevronLeft size={32} />
                                    <div className="text-xs text-center">{String(currentQIndex).padStart(2,'0')}</div>
                                </button>
                            )}
                            {currentQIndex < TOTAL_QUESTIONS - 1 && (
                                <button onClick={() => navigate('next')} className="absolute right-0 top-1/2 -translate-y-1/2 z-30 bg-white/50 hover:bg-white rounded-full p-2 text-gray-600 shadow-lg transform translate-x-1/2 md:translate-x-0">
                                    <ChevronRight size={32} />
                                    <div className="text-xs text-center">{String(currentQIndex + 2).padStart(2,'0')}</div>
                                </button>
                            )}

                            {/* Image Container - Use h-full to fit vertically */}
                            <div className="relative w-full h-full select-none flex items-center justify-center">
                                <img 
                                    src={currentQ.imagePath} 
                                    alt={`Problem ${currentQ.id}`} 
                                    className="max-w-full max-h-full object-contain pointer-events-none"
                                    onError={handleImageError}
                                />
                                <div className="hidden absolute inset-0 w-full h-full bg-gray-50 flex-col items-center justify-center text-gray-400 border-2 border-dashed border-gray-300">
                                    <ImageIcon size={48} className="mb-2" />
                                    <span className="text-xl font-bold text-gray-500">問題 {currentQ.id}</span>
                                    <span className="text-xs mt-2">画像を配置してください: root/{currentQ.imagePath}</span>
                                </div>
                                
                                {/* Canvas Overlay - Absolute to image container */}
                                <div className="absolute inset-0 w-full h-full">
                                    <CanvasLayer />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Controls Area (Bottom) - Fixed height */}
                    <div className="bg-white border-t border-gray-300 p-2 md:p-3 shrink-0 z-20 shadow-md">
                        {/* Toolbar */}
                        {/* Fixed: Removed transition-all to prevent lag sensation */}
                        <div className="flex justify-center items-center space-x-1 md:space-x-2 mb-2 bg-gray-100 py-1 px-2 rounded-lg inline-block mx-auto min-w-max">
                            {/* Eye button is always visible */}
                            <ToolBtn icon={isToolbarVisible ? Eye : EyeOff} active={isToolbarVisible} onClick={() => setIsToolbarVisible(!isToolbarVisible)} color="red" />
                            
                            {/* Other tools: Use invisible to keep layout space */}
                            <div className={`flex items-center space-x-1 md:space-x-2 ${isToolbarVisible ? '' : 'invisible pointer-events-none'}`}>
                                <div className="w-px h-6 bg-gray-300 mx-1"></div>
                                <ToolBtn icon={Pencil} active={tool==='pencil'} onClick={() => {setTool('pencil');}} selected={tool==='pencil'} />
                                <ToolBtn icon={Slash} active={tool==='line'} onClick={() => {setTool('line');}} selected={tool==='line'} />
                                <ToolBtn icon={Eraser} active={tool==='eraser'} onClick={() => {setTool('eraser');}} selected={tool==='eraser'} />
                                <div className="w-px h-6 bg-gray-300 mx-1"></div>
                                <ColorBtn color="black" active={color==='black'} onClick={() => setColor('black')} />
                                <ColorBtn color="red" active={color==='red'} onClick={() => setColor('red')} />
                                <ColorBtn color="blue" active={color==='blue'} onClick={() => setColor('blue')} />
                                <div className="w-px h-6 bg-gray-300 mx-1"></div>
                                <ToolBtn icon={Undo} onClick={undo} />
                                <ToolBtn icon={Redo} onClick={redo} />
                                <ToolBtn icon={Trash2} onClick={clearAll} />
                            </div>
                        </div>

                        {/* Answer Input Area */}
                        <div className="flex items-center space-x-2 md:space-x-4 max-w-4xl mx-auto">
                            <button 
                                onClick={() => toggleBookmark(currentQ.id)}
                                className={`flex flex-col items-center justify-center p-2 w-14 h-14 ${bookmarks[currentQ.id] ? 'bg-gray-800 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'} transition-colors rounded-sm`}
                            >
                                <div className="text-[9px] mb-0.5 whitespace-nowrap">後で解く</div>
                                <Bookmark size={20} className={bookmarks[currentQ.id] ? 'text-white fill-current' : 'text-gray-400'} />
                            </button>

                            <div className="flex-1 border-2 border-black h-14 flex items-center px-4 relative bg-gray-100">
                                {currentQ.type === 'text' ? (
                                    <input 
                                        type="text" 
                                        placeholder={lockedAnswers[currentQ.id] ? "" : "解答を入力してください"}
                                        value={answers[currentQ.id] || ""}
                                        onChange={(e) => handleAnswerChange(e.target.value)}
                                        disabled={lockedAnswers[currentQ.id]}
                                        className="w-full h-full bg-transparent text-xl outline-none disabled:text-gray-500"
                                    />
                                ) : (
                                    <div className="flex space-x-2 md:space-x-4 w-full h-full items-center overflow-x-auto">
                                        {currentQ.options.map((opt, idx) => (
                                            <button
                                                key={idx}
                                                disabled={lockedAnswers[currentQ.id]}
                                                onClick={() => handleAnswerChange(idx)}
                                                className={`flex items-center space-x-1 px-2 py-1 rounded whitespace-nowrap ${answers[currentQ.id] === idx ? 'text-red-600 font-bold' : 'text-gray-600'}`}
                                            >
                                                <span className={`w-4 h-4 rounded-full border flex-shrink-0 ${answers[currentQ.id] === idx ? 'bg-red-600 border-red-600' : 'border-gray-400'}`}></span>
                                                <span>{idx+1} {opt}</span>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <div className="w-28 md:w-32">
                                {lockedAnswers[currentQ.id] ? (
                                    <button 
                                        onClick={resetAnswer}
                                        className="w-full h-14 border-2 border-red-600 text-red-600 font-bold hover:bg-red-50 text-lg"
                                    >
                                        リセット
                                    </button>
                                ) : (
                                    <button 
                                        onClick={submitAnswer}
                                        className="w-full h-14 border-2 border-red-800 text-red-800 font-bold bg-white hover:bg-red-50 text-lg shadow-sm"
                                    >
                                        解答する
                                    </button>
                                )}
                            </div>
                        </div>
                        
                        <div className="md:hidden mt-1 text-center">
                            <button onClick={() => setIsMenuOpen(true)} className="text-xs font-bold flex items-center justify-center w-full py-1 bg-white border shadow-sm">
                                <List className="mr-2" size={14} /> 問題一覧を見る
                            </button>
                        </div>
                    </div>
                </div>

                {/* Sidebar (Desktop) - Scrollable independent of main area */}
                <div className="hidden md:flex w-64 bg-white border-l border-gray-300 flex-col shrink-0 overflow-hidden h-full">
                    <div ref={listContainerRef} className="flex-1 overflow-y-auto custom-scrollbar pb-20">
                        {QUESTION_CONFIG.map((q) => (
                            <QuestionListItem 
                                key={q.id} 
                                ref={(el) => itemRefs.current[q.id] = el}
                                q={q} 
                                isActive={currentQIndex === q.id - 1}
                                isAnswered={!!lockedAnswers[q.id]}
                                isBookmarked={!!bookmarks[q.id]}
                                userAnswer={answers[q.id]}
                                onClick={() => setCurrentQIndex(q.id - 1)}
                            />
                        ))}
                    </div>
                </div>
            </div>

            {/* Mobile Menu Modal */}
            {isMenuOpen && (
                <div className="fixed inset-0 z-50 bg-gray-800/80 flex items-center justify-center p-4">
                    <div className="bg-white w-full h-full max-w-md rounded-lg overflow-hidden flex flex-col relative">
                        <div className="p-4 border-b flex justify-between items-center bg-gray-100">
                            <span className="font-bold">問題一覧</span>
                            <button onClick={() => setIsMenuOpen(false)}>
                                <X size={24} className="text-gray-600" />
                            </button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-2">
                            {QUESTION_CONFIG.map((q) => (
                                <QuestionListItem 
                                    key={q.id} 
                                    q={q} 
                                    isActive={currentQIndex === q.id - 1}
                                    isAnswered={!!lockedAnswers[q.id]}
                                    isBookmarked={!!bookmarks[q.id]}
                                    userAnswer={answers[q.id]}
                                    onClick={() => {
                                        setCurrentQIndex(q.id - 1);
                                        setIsMenuOpen(false);
                                    }}
                                />
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

// 3. Result Screen
const FinishScreen = ({ userAnswers, onRestart }) => {
    // Calculate Score
    const results = useMemo(() => {
        let totalScore = 0;
        const grading = QUESTION_CONFIG.map(q => {
            const userAns = userAnswers[q.id];
            let isCorrect = false;
            let displayUserAns = "-";
            let displayCorrectAns = "-";

            // Formatting display text
            if (q.type === 'choice') {
                displayUserAns = userAns !== undefined ? `④${q.options[userAns]}` : "未回答";
                displayCorrectAns = `④${q.options[q.correctAnswer]}`;
                isCorrect = userAns === q.correctAnswer;
            } else {
                displayUserAns = userAns || "未回答";
                displayCorrectAns = q.correctAnswer;
                // Simple string match for mock purpose
                isCorrect = userAns === q.correctAnswer; 
            }

            if (isCorrect) totalScore += q.points;

            return {
                id: q.id,
                userAns: displayUserAns,
                correctAns: displayCorrectAns,
                isCorrect
            };
        });
        return { grading, totalScore };
    }, [userAnswers]);

    return (
        <div className="flex flex-col h-full bg-white font-sans overflow-hidden">
             <div className="border-b-2 border-red-600 p-4 flex justify-between items-center bg-white shrink-0">
                <h1 className="text-2xl font-bold text-red-600">受検結果</h1>
                <div className="text-xl font-bold">
                    合計得点: <span className="text-3xl text-red-600">{results.totalScore}</span> / 100点
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 md:p-8 bg-gray-50">
                <div className="max-w-4xl mx-auto bg-white shadow rounded-lg overflow-hidden">
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-gray-100 border-b border-gray-300">
                            <tr>
                                <th className="p-3 text-center w-20">No.</th>
                                <th className="p-3 w-1/4">正解</th>
                                <th className="p-3 w-1/4">あなたの答え</th>
                                <th className="p-3 text-center w-20">判定</th>
                            </tr>
                        </thead>
                        <tbody>
                            {results.grading.map((row) => (
                                <tr key={row.id} className="border-b border-gray-200 hover:bg-gray-50">
                                    <td className="p-3 text-center font-bold text-gray-700">{row.id}</td>
                                    <td className="p-3 text-green-700 font-medium">{row.correctAns}</td>
                                    <td className="p-3 text-gray-800">{row.userAns}</td>
                                    <td className="p-3 text-center">
                                        {row.isCorrect ? (
                                            <CheckCircle className="inline text-green-500" size={24} />
                                        ) : (
                                            <XCircle className="inline text-red-500" size={24} />
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                <div className="flex justify-center mt-8 pb-8">
                     <button 
                        onClick={onRestart}
                        className="bg-red-600 text-white font-bold text-lg py-4 px-12 hover:bg-red-700 shadow-lg transition-transform hover:scale-105"
                    >
                        トップページに戻る
                    </button>
                </div>
            </div>
        </div>
    );
};

// --- Subcomponents ---

const ToolBtn = ({ icon: Icon, active, onClick, selected, color }) => (
    <button 
        onClick={onClick}
        className={`w-8 h-8 md:w-10 md:h-10 flex items-center justify-center rounded border transition-all ${
            selected ? 'border-red-500 bg-red-50 text-red-600' : 'border-transparent text-gray-600 hover:bg-gray-200'
        }`}
    >
        <Icon size={20} className={`${active === false ? 'text-gray-300' : ''} ${color === 'red' && active ? 'text-red-600' : ''}`} />
    </button>
);

const ColorBtn = ({ color, active, onClick }) => (
    <button 
        onClick={onClick}
        className={`w-6 h-6 md:w-8 md:h-8 rounded-full border-2 mx-1 flex items-center justify-center ${
            active ? 'border-red-500 scale-110' : 'border-transparent opacity-70 hover:opacity-100'
        }`}
    >
        <div className={`w-full h-full rounded-full border border-gray-300`} style={{ backgroundColor: color }}></div>
    </button>
);

// Fixed: Used forwardRef to expose DOM element to parent for auto-scrolling
const QuestionListItem = React.forwardRef(({ q, isActive, isAnswered, isBookmarked, userAnswer, onClick }, ref) => {
    let answerText = "";
    if (isAnswered) {
        if (q.type === 'choice' && userAnswer !== undefined) {
            answerText = `④${q.options[userAnswer]}`; 
        } else if (userAnswer) {
            answerText = userAnswer;
        }
    }

    return (
        <button 
            ref={ref}
            onClick={onClick}
            className={`w-full border-b border-gray-200 flex items-stretch text-left h-20 transition-colors
                ${isActive ? 'bg-red-50' : 'bg-white'}
                ${isAnswered ? 'bg-gray-50' : ''}
            `}
        >
            <div className={`w-1 shrink-0 ${isActive ? 'bg-red-600' : isBookmarked ? 'bg-red-500' : 'bg-transparent'}`}></div>
            
            <div className="flex-1 p-2 flex flex-col justify-between relative overflow-hidden">
                <div className="flex justify-between items-start pl-4 relative">
                    <div className="flex flex-col">
                        <span className={`text-2xl font-bold leading-none ${isActive ? 'text-red-600' : 'text-gray-400'}`}>
                            {String(q.id).padStart(2, '0')}
                        </span>
                    </div>
                    <span className="text-xs text-gray-400">{q.points}点</span>
                </div>
                
                {/* Fixed: Absolute positioning for bookmark to prevent layout shift */}
                {isBookmarked && (
                    <div className="absolute top-8 left-5 text-red-600">
                        <Bookmark size={24} className="fill-current" />
                    </div>
                )}
                
                <div className="flex justify-end items-end h-full">
                    {isAnswered ? (
                        <span className="text-sm font-bold text-gray-500 truncate max-w-[120px]">{answerText}</span>
                    ) : (
                        <div className="w-8 h-8 bg-gray-100 border text-[8px] flex items-center justify-center text-gray-400">
                            img
                        </div>
                    )}
                </div>
            </div>
        </button>
    );
});

// --- Main App Container ---
export default function App() {
    const [screen, setScreen] = useState('start'); // start, exam, finish
    const [userName, setUserName] = useState("");
    const [finalAnswers, setFinalAnswers] = useState({});

    const startExam = (name) => {
        setUserName(name);
        setScreen('exam');
    };

    const finishExam = (answers) => {
        setFinalAnswers(answers);
        setScreen('finish');
    };
    
    const restart = () => {
        setUserName("");
        setFinalAnswers({});
        setScreen('start');
    };

    return (
        <div className="h-screen w-full font-sans border-[8px] border-red-600 box-border overflow-hidden">
            {/* Inject Global Styles for Scrollbar */}
            <style>{`
                .custom-scrollbar::-webkit-scrollbar { width: 6px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: #f1f1f1; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: #ccc; border-radius: 3px; }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #888; }
            `}</style>
            
            {screen === 'start' && <StartScreen onStart={startExam} />}
            {screen === 'exam' && <ExamScreen userName={userName} onFinish={finishExam} />}
            {screen === 'finish' && <FinishScreen userAnswers={finalAnswers} onRestart={restart} />}
        </div>
    );
};
