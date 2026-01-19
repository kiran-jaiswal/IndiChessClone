import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    LogOut,
    Trophy,
    Swords,
    Clock,
    ChevronRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { ChessKnight } from '@/components/ChessIcon';
import { matchApi } from '@/lib/api';

export default function Dashboard() {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const { toast } = useToast();

    const [matchId, setMatchId] = useState('');

    const handleLogout = () => {
        logout();
        toast({
            title: 'Signed out',
            description: 'See you next time!',
        });
        navigate('/login');
    };

    // ✅ JOIN PRIVATE MATCH (PLAYER 2)
    const handleJoinMatch = async () => {
        if (!matchId) return;

        try {
            await matchApi.joinMatch(Number(matchId));
            navigate(`/game?matchId=${matchId}`);
        } catch {
            toast({
                title: 'Error',
                description: 'Invalid or unavailable match',
                variant: 'destructive',
            });
        }
    };

    const stats = [
        { label: 'Games Played', value: '0', icon: Swords },
        { label: 'Wins', value: '0', icon: Trophy },
        { label: 'Play Time', value: '0h', icon: Clock },
    ];

    const quickActions = [
        {
            label: 'Play Online',
            description: 'Find a random opponent',
            primary: true,
            onClick: () => navigate('/play'),
        },
        {
            label: 'Play vs Computer',
            description: 'Practice with AI',
            onClick: () => navigate('/game-ai'),
        },
        {
            label: 'Create Game',
            description: 'Invite a friend',
            onClick: () => navigate('/create-match'),
        },
    ];

    return (
        <div className="min-h-screen">
            {/* Header */}
            <header className="border-b border-border/50 bg-card/50 backdrop-blur-xl sticky top-0 z-50">
                <div className="container mx-auto px-4 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <ChessKnight className="w-8 h-8 text-primary" />
                        <span className="font-display text-xl font-semibold">
                            IndiChess
                        </span>
                    </div>

                    <div className="flex items-center gap-4">
                        <span className="text-sm text-muted-foreground hidden sm:block">
                            {user?.email}
                        </span>
                        <Button variant="ghost" size="sm" onClick={handleLogout}>
                            <LogOut className="w-4 h-4" />
                            <span className="hidden sm:inline ml-2">
                                Sign Out
                            </span>
                        </Button>
                    </div>
                </div>
            </header>

            {/* Main */}
            <main className="container mx-auto px-4 py-8">
                {/* Welcome */}
                <section className="mb-12">
                    <h1 className="text-4xl font-display font-bold mb-2">
                        Welcome back,{' '}
                        <span className="text-gradient">
                            {user?.email?.split('@')[0]}
                        </span>
                    </h1>
                    <p className="text-muted-foreground text-lg">
                        Ready to play some chess?
                    </p>
                </section>

                {/* Stats */}
                <section className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-12">
                    {stats.map((stat) => (
                        <div key={stat.label} className="card-glass">
                            <div className="flex items-center gap-4">
                                <div className="p-3 rounded-xl bg-primary/10">
                                    <stat.icon className="w-6 h-6 text-primary" />
                                </div>
                                <div>
                                    <div className="text-2xl font-display font-bold">
                                        {stat.value}
                                    </div>
                                    <div className="text-sm text-muted-foreground">
                                        {stat.label}
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </section>

                {/* Quick Play */}
                <section className="mb-8">
                    <h2 className="text-xl font-display font-semibold mb-6">
                        Quick Play
                    </h2>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {quickActions.map((action) => (
                            <button
                                key={action.label}
                                onClick={action.onClick}
                                className={`card-glass text-left hover:scale-[1.02] transition ${
                                    action.primary
                                        ? 'ring-2 ring-primary/50 bg-primary/5'
                                        : ''
                                }`}
                            >
                                <div className="flex items-center justify-between">
                                    <div>
                                        <div className="font-semibold">
                                            {action.label}
                                        </div>
                                        <div className="text-sm text-muted-foreground">
                                            {action.description}
                                        </div>
                                    </div>
                                    <ChevronRight className="w-5 h-5 text-muted-foreground" />
                                </div>
                            </button>
                        ))}
                    </div>
                </section>

                {/* Join Match */}
                <section className="card-glass max-w-md">
                    <h3 className="font-semibold mb-3">Join Match</h3>
                    <Input
                        placeholder="Enter Match ID"
                        value={matchId}
                        onChange={(e) => setMatchId(e.target.value)}
                    />
                    <Button className="mt-3 w-full" onClick={handleJoinMatch}>
                        Join Game
                    </Button>
                </section>
            </main>
        </div>
    );
}
