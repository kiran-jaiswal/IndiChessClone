import { useEffect, useState, useRef, useMemo } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Flag, User, Circle, Trophy, MessageCircle, Send, X } from "lucide-react";
import { ChessKnight } from "@/components/ChessIcon.tsx";
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { useAuth } from "@/contexts/AuthContext";
import { matchApi } from "@/lib/api";

/* ---------- TYPES & HELPERS ---------- */
type PieceType = 'k' | 'q' | 'r' | 'b' | 'n' | 'p';
type Color = 'w' | 'b';
type Piece = { type: PieceType; color: Color } | null;
type Board = Piece[][];
type Square = [number, number];

interface MoveEntry {
    moveNumber: number;
    white?: string;
    black?: string;
}

interface ChatMessage {
    id: number;
    senderEmail: string;
    message: string;
    sentAt: string;
}

const fenToBoard = (fen: string): Board => {
    if (!fen) return Array.from({ length: 8 }, () => Array(8).fill(null));
    const rows = fen.split(" ")[0].split("/");
    const board: Board = Array.from({ length: 8 }, () => Array(8).fill(null));
    rows.forEach((row, r) => {
        let c = 0;
        for (const ch of row) {
            if (!isNaN(Number(ch))) c += Number(ch);
            else {
                board[r][c] = {
                    type: ch.toLowerCase() as PieceType,
                    color: ch === ch.toUpperCase() ? "w" : "b",
                };
                c++;
            }
        }
    });
    return board;
};

const pieceSymbols: Record<string, string> = {
    'k': '♔', 'q': '♕', 'r': '♖', 'b': '♗', 'n': '♘', 'p': '♙'
};

/* ---------- SUB-COMPONENTS ---------- */
const ChessPiece = ({ type, color }: { type: string; color: Color }) => (
    <div className={`text-5xl select-none ${
        color === 'w'
            ? 'text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]'
            : 'text-gray-900 drop-shadow-[0_2px_4px_rgba(255,255,255,0.3)]'
    }`}>
        {pieceSymbols[type]}
    </div>
);

const Timer = ({ seconds, isActive }: { seconds: number; isActive: boolean }) => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return (
        <div className={`px-4 py-2 rounded-lg font-mono text-xl font-bold transition-all ${
            isActive
                ? 'bg-green-500/20 text-green-400 border border-green-500/30 animate-pulse'
                : 'bg-slate-700/50 text-slate-500'
        }`}>
            {minutes}:{secs.toString().padStart(2, '0')}
        </div>
    );
};

/* ---------- MAIN COMPONENT ---------- */
export default function ChessGame() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const matchId = searchParams.get("matchId");
    const { user } = useAuth();

    const [board, setBoard] = useState<Board>(Array.from({ length: 8 }, () => Array(8).fill(null)));
    const [matchData, setMatchData] = useState<any>(null);
    const [stompClient, setStompClient] = useState<Client | null>(null);
    const [moveFrom, setMoveFrom] = useState<Square | null>(null);
    const [whiteTime, setWhiteTime] = useState(600);
    const [blackTime, setBlackTime] = useState(600);
    const [validMoves, setValidMoves] = useState<Square[]>([]);
    const [moves, setMoves] = useState<MoveEntry[]>([]);
    const [promotionReq, setPromotionReq] = useState<{ from: Square; to: Square } | null>(null);

    // Chat states
    const [chatOpen, setChatOpen] = useState(false);
    const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
    const [newMessage, setNewMessage] = useState("");
    const [unreadCount, setUnreadCount] = useState(0);

    const movesEndRef = useRef<HTMLDivElement | null>(null);
    const chatEndRef = useRef<HTMLDivElement | null>(null);

    // Auto-scroll
    useEffect(() => {
        movesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [moves]);

    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [chatMessages]);

    const playerInfo = useMemo(() => {
        if (!matchData || !user) return null;
        const p1Email = matchData.player1?.email || matchData.player1Email;
        const p2Email = matchData.player2?.email || matchData.player2Email;
        const isWhite = user.email === p1Email;
        const currentTurnEmail = matchData.currentTurnEmail;

        return {
            isWhite,
            myColor: (isWhite ? "w" : "b") as Color,
            opponentEmail: isWhite ? p2Email : p1Email,
            isMyTurn: currentTurnEmail === user.email,
            p1Email,
            p2Email
        };
    }, [matchData, user]);

    const updateMatchState = (data: any) => {
        setMatchData(data);
        if (data.fenCurrent) setBoard(fenToBoard(data.fenCurrent));

        if (data.lastMoveUci) {
            setMoves(prev => {
                const isWhiteMove = data.currentTurnEmail !== data.player1Email;
                const updated = [...prev];

                if (isWhiteMove) {
                    if (updated.length === 0 || updated[updated.length - 1].black) {
                        updated.push({
                            moveNumber: updated.length + 1,
                            white: data.lastMoveUci
                        });
                    }
                } else if (updated.length > 0) {
                    updated[updated.length - 1].black = data.lastMoveUci;
                }
                return updated;
            });
        }

        setWhiteTime(data.whiteTime || 600);
        setBlackTime(data.blackTime || 600);
        setMoveFrom(null);
        setValidMoves([]);
    };

    // Load chat history
    const loadChatHistory = async () => {
        if (!matchId) return;
        try {
            const response = await fetch(`http://localhost:8080/match/${matchId}/chat`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });
            if (response.ok) {
                const messages = await response.json();
                setChatMessages(messages);
            }
        } catch (error) {
            console.error("Failed to load chat history:", error);
        }
    };

    // WebSocket Connection
    // @ts-ignore
    useEffect(() => {
        if (!matchId) return;

        const socket = new SockJS('http://localhost:8080/ws');
        const client = new Client({
            webSocketFactory: () => socket,
            connectHeaders: { Authorization: `Bearer ${localStorage.getItem('token')}` },
            onConnect: () => {
                console.log("✅ Connected to WebSocket");

                // Subscribe to game updates
                client.subscribe(`/topic/game/${matchId}`, (message) => {
                    const data = JSON.parse(message.body);
                    updateMatchState(data);
                });

                // Subscribe to chat messages
                client.subscribe(`/topic/game/${matchId}/chat`, (message) => {
                    const chatMsg = JSON.parse(message.body);
                    console.log("💬 Received chat message:", chatMsg);
                    setChatMessages(prev => [...prev, chatMsg]);

                    // Increment unread if chat is closed
                    if (!chatOpen && chatMsg.senderEmail !== user?.email) {
                        setUnreadCount(prev => prev + 1);
                    }
                });

                // Load chat history
                loadChatHistory();
            }
        });

        client.activate();
        setStompClient(client);
        return () => client.deactivate();
    }, [matchId]);

    // Reset unread when opening chat
    useEffect(() => {
        if (chatOpen) {
            setUnreadCount(0);
        }
    }, [chatOpen]);

    // Initial Data Fetch
    useEffect(() => {
        if (matchId) {
            matchApi.getMatch(Number(matchId)).then(updateMatchState);
        }
    }, [matchId]);

    // Clock Logic
    useEffect(() => {
        if (!matchData || matchData.status !== 'ONGOING') return;
        const interval = setInterval(() => {
            if (matchData.currentTurnEmail === playerInfo?.p1Email) {
                setWhiteTime(prev => Math.max(0, prev - 1));
            } else {
                setBlackTime(prev => Math.max(0, prev - 1));
            }
        }, 1000);
        return () => clearInterval(interval);
    }, [matchData?.currentTurnEmail, matchData?.status, playerInfo]);

    const calculateValidMoves = (fromRow: number, fromCol: number): Square[] => {
        const piece = board[fromRow][fromCol];
        if (!piece) return [];
        const moves: Square[] = [];
        const { type, color } = piece;

        const push = (nr: number, nc: number) => {
            if (nr >= 0 && nr < 8 && nc >= 0 && nc < 8) {
                const target = board[nr][nc];
                if (!target || target.color !== color) moves.push([nr, nc]);
            }
        };

        if (type === 'p') {
            const direction = color === 'w' ? -1 : 1;
            if (!board[fromRow + direction]?.[fromCol]) {
                push(fromRow + direction, fromCol);
                const startRow = color === 'w' ? 6 : 1;
                if (fromRow === startRow && !board[fromRow + 2 * direction]?.[fromCol]) {
                    push(fromRow + 2 * direction, fromCol);
                }
            }
            [[-1], [1]].forEach(([cOff]) => {
                const target = board[fromRow + direction]?.[fromCol + cOff];
                if (target && target.color !== color) moves.push([fromRow + direction, fromCol + cOff]);
            });
        } else if (type === 'n') {
            [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]].forEach(([dr, dc]) => push(fromRow + dr, fromCol + dc));
        } else if (['b','r','q'].includes(type)) {
            const dirs = type === 'r' ? [[0,1],[0,-1],[1,0],[-1,0]] : type === 'b' ? [[1,1],[1,-1],[-1,1],[-1,-1]] : [[0,1],[0,-1],[1,0],[-1,0],[1,1],[1,-1],[-1,1],[-1,-1]];
            dirs.forEach(([dr, dc]) => {
                let nr = fromRow + dr, nc = fromCol + dc;
                while (nr >= 0 && nr < 8 && nc >= 0 && nc < 8) {
                    const target = board[nr][nc];
                    if (!target) moves.push([nr, nc]);
                    else { if (target.color !== color) moves.push([nr, nc]); break; }
                    nr += dr; nc += dc;
                }
            });
        } else if (type === 'k') {
            [[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]].forEach(([dr, dc]) => push(fromRow + dr, fromCol + dc));
        }
        return moves;
    };

    const onSquareClick = (row: number, col: number) => {
        if (matchData?.status !== 'ONGOING' || !playerInfo?.isMyTurn) return;

        const piece = board[row][col];

        if (piece?.color === playerInfo.myColor) {
            setMoveFrom([row, col]);
            setValidMoves(calculateValidMoves(row, col));
            return;
        }

        if (moveFrom) {
            const isValid = validMoves.some(([vr, vc]) => vr === row && vc === col);
            if (!isValid) {
                setMoveFrom(null);
                setValidMoves([]);
                return;
            }

            const movingPiece = board[moveFrom[0]][moveFrom[1]];
            const isPromotion = movingPiece?.type === 'p' && (row === 0 || row === 7);

            if (isPromotion) {
                setPromotionReq({ from: moveFrom, to: [row, col] });
            } else {
                sendMove(moveFrom, [row, col]);
            }
        }
    };

    const sendMove = (from: Square, to: Square, promotionPiece = '') => {
        const uci = `${String.fromCharCode(97 + from[1])}${8 - from[0]}${String.fromCharCode(97 + to[1])}${8 - to[0]}${promotionPiece}`;

        if (stompClient?.connected) {
            stompClient.publish({
                destination: `/app/game/${matchId}/move`,
                body: JSON.stringify({ uci })
            });
        }
        setMoveFrom(null);
        setValidMoves([]);
        setPromotionReq(null);
    };

    const sendChatMessage = () => {
        if (!newMessage.trim() || !stompClient?.connected) return;

        stompClient.publish({
            destination: `/app/game/${matchId}/chat`,
            body: JSON.stringify({ message: newMessage.trim() })
        });

        setNewMessage("");
    };

    const handleResign = async () => {
        if (window.confirm("Are you sure you want to resign?")) {
            try {
                await matchApi.resign(Number(matchId));
                navigate("/dashboard");
            } catch (error) { console.error(error); }
        }
    };

    const getGameResult = () => {
        if (matchData.status === 'WHITE_WIN') return playerInfo?.isWhite ? 'You Won!' : 'You Lost';
        if (matchData.status === 'BLACK_WIN') return playerInfo?.isWhite ? 'You Lost' : 'You Won!';
        if (matchData.status === 'DRAW') return 'Draw';
        return null;
    };

    if (!matchData || !playerInfo) return <div className="min-h-screen flex items-center justify-center text-white bg-slate-900">Loading...</div>;

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
            <header className="border-b border-slate-700/50 bg-slate-900/95 backdrop-blur-md sticky top-0 z-50">
                <div className="container mx-auto px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <ChessKnight className="w-8 h-8 text-primary" />
                        <span className="text-xl font-display font-bold text-white">IndiChess</span>
                    </div>
                    <Button variant="ghost" onClick={() => navigate("/dashboard")} className="text-slate-300 hover:text-white">
                        <ArrowLeft className="w-4 h-4 mr-2" />Back
                    </Button>
                </div>
            </header>

            <main className="container mx-auto px-4 py-8">
                <div className="max-w-7xl mx-auto grid lg:grid-cols-[1fr_400px] gap-8">
                    <div className="space-y-6">
                        {/* Opponent Section */}
                        <Card className="bg-slate-800/80 border-slate-700/50">
                            <CardContent className="p-4 flex items-center justify-between">
                                <div className="flex items-center gap-3 text-white">
                                    <div className="w-12 h-12 rounded-full bg-blue-500/20 flex items-center justify-center border border-blue-500/50">
                                        <User className="text-blue-400" />
                                    </div>
                                    <div>
                                        <p className="font-semibold">{playerInfo.opponentEmail || "Waiting..."}</p>
                                        <p className="text-xs text-slate-400 uppercase tracking-wider">Opponent</p>
                                    </div>
                                </div>
                                <Timer seconds={playerInfo.isWhite ? blackTime : whiteTime} isActive={!playerInfo.isMyTurn && matchData.status === 'ONGOING'} />
                            </CardContent>
                        </Card>

                        {/* Chess Board */}
                        <Card className="bg-slate-800/50 border-slate-700/50 p-4 sm:p-8 flex justify-center shadow-2xl">
                            <div className="grid grid-cols-8 border-4 border-slate-900 rounded-sm">
                                {board.map((row, r) => row.map((piece, c) => {
                                    const isLight = (r + c) % 2 === 0;
                                    const isSelected = moveFrom?.[0] === r && moveFrom?.[1] === c;
                                    const isValidMove = validMoves.some(([vr, vc]) => vr === r && vc === c);
                                    return (
                                        <div
                                            key={`${r}-${c}`}
                                            onClick={() => onSquareClick(r, c)}
                                            className={`
                                                w-[55px] h-[55px] sm:w-[80px] sm:h-[80px]
                                                flex items-center justify-center cursor-pointer relative
                                                transition-all duration-200
                                                ${isLight ? 'bg-[#f0d9b5]' : 'bg-[#b58863]'}
                                                hover:brightness-95
                                                ${isSelected ? 'ring-4 ring-blue-500 ring-inset z-10' : ''}
                                            `}
                                        >
                                            {piece && <ChessPiece type={piece.type} color={piece.color} />}
                                            {isValidMove && (
                                                <div className={`absolute w-3 h-3 rounded-full ${piece ? 'ring-4 ring-green-500/60 w-full h-full' : 'bg-green-500/60'}`} />
                                            )}
                                        </div>
                                    );
                                }))}
                            </div>
                        </Card>

                        {/* Self Section */}
                        <Card className="bg-slate-800/80 border-slate-700/50">
                            <CardContent className="p-4 flex items-center justify-between">
                                <div className="flex items-center gap-3 text-white">
                                    <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center border border-primary/50">
                                        <User className="text-primary" />
                                    </div>
                                    <div>
                                        <p className="font-semibold">You ({user?.email})</p>
                                        <p className="text-xs text-slate-400 uppercase tracking-wider">{playerInfo.isWhite ? "WHITE" : "BLACK"}</p>
                                    </div>
                                </div>
                                <Timer seconds={playerInfo.isWhite ? whiteTime : blackTime} isActive={playerInfo.isMyTurn && matchData.status === 'ONGOING'} />
                            </CardContent>
                        </Card>
                    </div>

                    {/* Promotion Modal */}
                    {promotionReq && (
                        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm">
                            <div className="bg-slate-800 border border-slate-700 p-8 rounded-2xl shadow-2xl text-center">
                                <h3 className="text-xl font-bold text-white mb-6">Promote Your Pawn</h3>
                                <div className="flex gap-4">
                                    {['q', 'r', 'b', 'n'].map((type) => (
                                        <Button
                                            key={type}
                                            variant="outline"
                                            className="w-20 h-20 text-4xl bg-slate-700 hover:bg-primary/20 border-slate-600"
                                            onClick={() => sendMove(promotionReq.from, promotionReq.to, type)}
                                        >
                                            {pieceSymbols[type]}
                                        </Button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Sidebar with Move History and Chat */}
                    <div className="space-y-6 flex flex-col h-full relative">
                        {/* Chat Toggle Button (Mobile) */}
                        <Button
                            onClick={() => setChatOpen(!chatOpen)}
                            className="fixed bottom-6 right-6 lg:hidden w-14 h-14 rounded-full shadow-lg z-50"
                            size="icon"
                        >
                            {chatOpen ? <X className="w-6 h-6" /> : <MessageCircle className="w-6 h-6" />}
                            {unreadCount > 0 && (
                                <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full w-6 h-6 flex items-center justify-center">
                                    {unreadCount}
                                </span>
                            )}
                        </Button>

                        <Card className="bg-slate-800/80 border-slate-700/50 text-white p-6 shadow-xl flex flex-col h-[750px]">
                            {/* Match Status */}
                            <div className="mb-6">
                                <h2 className="text-xl font-display font-bold mb-4 flex items-center gap-2">
                                    <Circle className={`w-3 h-3 ${playerInfo.isMyTurn ? 'fill-green-500 text-green-500 animate-pulse' : 'text-slate-600'}`} />
                                    Match Status
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="ml-auto"
                                        onClick={() => setChatOpen(!chatOpen)}
                                    >
                                        <MessageCircle className="w-5 h-5" />
                                        {unreadCount > 0 && (
                                            <span className="ml-1 bg-red-500 text-white text-xs rounded-full px-2 py-0.5">
                                                {unreadCount}
                                            </span>
                                        )}
                                    </Button>
                                </h2>

                                <div className="space-y-3">
                                    <div className="flex justify-between items-center p-3 bg-slate-900/50 rounded-lg border border-slate-700/50">
                                        <span className="text-slate-400 text-sm tracking-tight">Match ID</span>
                                        <span className="font-mono font-bold text-primary">#{matchId}</span>
                                    </div>

                                    {matchData.status !== 'ONGOING' ? (
                                        <div className="p-4 rounded-xl border-2 text-center bg-gradient-to-br from-primary/20 to-purple-500/20 border-primary/40">
                                            <Trophy className="w-8 h-8 mx-auto mb-2 text-primary" />
                                            <p className="text-xl font-bold">{getGameResult()}</p>
                                            <p className="text-[10px] text-slate-400 uppercase tracking-widest">{matchData.status.replace('_', ' ')}</p>
                                        </div>
                                    ) : (
                                        <div className={`p-4 rounded-xl border text-center transition-all ${
                                            playerInfo.isMyTurn ? 'bg-primary/20 border-primary/50 shadow-[0_0_15px_rgba(var(--primary),0.1)]' : 'bg-slate-900/30 border-slate-700/50'
                                        }`}>
                                            <p className="text-md font-black tracking-tighter">
                                                {playerInfo.isMyTurn ? "YOUR TURN" : "OPPONENT'S TURN"}
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <hr className="border-slate-700/50 mb-6" />

                            {/* Tabbed Content - Move History or Chat */}
                            {chatOpen ? (
                                /* Chat Section */
                                <div className="flex-1 flex flex-col min-h-0">
                                    <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-widest mb-3">Chat</h3>
                                    <div className="flex-1 bg-slate-900/50 border border-slate-700/50 rounded-xl p-4 overflow-hidden flex flex-col">
                                        <div className="flex-1 overflow-y-auto pr-2 space-y-2 custom-scrollbar">
                                            {chatMessages.length === 0 ? (
                                                <div className="h-full flex items-center justify-center text-slate-600 italic text-sm">
                                                    No messages yet
                                                </div>
                                            ) : (
                                                chatMessages.map((msg) => (
                                                    <div
                                                        key={msg.id}
                                                        className={`flex ${msg.senderEmail === user?.email ? 'justify-end' : 'justify-start'}`}
                                                    >
                                                        <div className={`max-w-[80%] rounded-lg p-3 ${
                                                            msg.senderEmail === user?.email
                                                                ? 'bg-primary/20 text-white'
                                                                : 'bg-slate-700/50 text-slate-200'
                                                        }`}>
                                                            <p className="text-sm break-words">{msg.message}</p>
                                                            <p className="text-[10px] text-slate-400 mt-1">
                                                                {new Date(msg.sentAt).toLocaleTimeString()}
                                                            </p>
                                                        </div>
                                                    </div>
                                                ))
                                            )}
                                            <div ref={chatEndRef} />
                                        </div>
                                    </div>
                                    <div className="mt-3 flex gap-2">
                                        <Input
                                            value={newMessage}
                                            onChange={(e) => setNewMessage(e.target.value)}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') {
                                                    sendChatMessage();
                                                }
                                            }}

                                            placeholder="Type a message..."
                                            className="flex-1 bg-slate-700/50 border-slate-600"
                                            maxLength={500}
                                        />
                                        <Button onClick={sendChatMessage} size="icon">
                                            <Send className="w-4 h-4" />
                                        </Button>
                                    </div>
                                </div>
                            ) : (
                                /* Move History Section */
                                <div className="flex-1 flex flex-col min-h-0">
                                    <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-widest mb-3">Move History</h3>
                                    <div className="flex-1 bg-slate-900/50 border border-slate-700/50 rounded-xl p-4 overflow-hidden flex flex-col">
                                        <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
                                            {moves.length === 0 ? (
                                                <div className="h-full flex items-center justify-center text-slate-600 italic text-sm">No moves yet</div>
                                            ) : (
                                                <div className="space-y-1">
                                                    <div className="grid grid-cols-[40px_1fr_1fr] gap-3 px-3 text-[10px] text-slate-500 font-bold uppercase mb-2 sticky top-0 bg-slate-900/95 py-1">
                                                        <span>#</span><span>White</span><span>Black</span>
                                                    </div>
                                                    {moves.map((m) => (
                                                        <div key={m.moveNumber} className="grid grid-cols-[40px_1fr_1fr] gap-3 py-2 px-3 bg-slate-800/40 rounded-lg border border-slate-700/30">
                                                            <span className="text-slate-500 font-mono text-xs">{m.moveNumber}.</span>
                                                            <span className="font-mono text-white text-sm">{m.white}</span>
                                                            <span className="font-mono text-slate-300 text-sm">{m.black || "—"}</span>
                                                        </div>
                                                    ))}
                                                    <div ref={movesEndRef} />
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {matchData.status === 'ONGOING' && (
                                <div className="mt-6 pt-6 border-t border-slate-700/50">
                                    <Button variant="destructive" className="w-full h-12 shadow-lg" onClick={handleResign} disabled={!playerInfo.p2Email}>
                                        <Flag className="w-4 h-4 mr-2" /> Resign Match
                                    </Button>
                                </div>
                            )}
                        </Card>
                    </div>
                </div>
            </main>

            <style>{`
                .custom-scrollbar::-webkit-scrollbar {
                    width: 6px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: rgba(51, 65, 85, 0.3);
                    border-radius: 3px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: rgba(148, 163, 184, 0.5);
                    border-radius: 3px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                    background: rgba(148, 163, 184, 0.7);
                }
            `}</style>
        </div>
    );
}