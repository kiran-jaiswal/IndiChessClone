import { Link } from 'react-router-dom';
import { ArrowRight, Zap, Shield, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ChessKnight } from '@/components/ChessIcon';

export default function Index() {
  const features = [
    {
      icon: Zap,
      title: 'Lightning Fast',
      description: 'Real-time gameplay with instant moves and smooth animations',
    },
    {
      icon: Shield,
      title: 'Secure Auth',
      description: 'JWT-based authentication keeps your account safe',
    },
    {
      icon: Users,
      title: 'Multiplayer',
      description: 'Challenge players from around the world anytime',
    },
  ];

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="border-b border-border/50 bg-card/30 backdrop-blur-xl">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <ChessKnight className="w-8 h-8 text-primary" />
            <span className="font-display text-xl font-semibold">IndiChess</span>
          </div>
          
          <div className="flex items-center gap-3">
            <Button variant="ghost" asChild>
              <Link to="/login">Sign In</Link>
            </Button>
            <Button asChild>
              <Link to="/register">Get Started</Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1">
        <section className="container mx-auto px-4 py-20 lg:py-32">
          <div className="max-w-4xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-8 animate-fade-in">
              <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
              <span className="text-sm text-primary">Now in Early Access</span>
            </div>

            <h1 
              className="text-5xl md:text-7xl font-display font-bold leading-tight mb-6 animate-fade-in"
              style={{ animationDelay: '100ms' }}
            >
              Master Chess.
              <br />
              <span className="text-gradient">Conquer Opponents.</span>
            </h1>

            <p 
              className="text-xl text-muted-foreground max-w-2xl mx-auto mb-10 animate-fade-in"
              style={{ animationDelay: '200ms' }}
            >
              Experience chess like never before with IndiChess. Beautiful interface,
              real-time multiplayer, and powerful features to elevate your game.
            </p>

            <div 
              className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-fade-in"
              style={{ animationDelay: '300ms' }}
            >
              <Button size="xl" asChild className="glow">
                <Link to="/register">
                  Start Playing Free
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Link>
              </Button>
              <Button size="xl" variant="glass" asChild>
                <Link to="/login">
                  Sign In
                </Link>
              </Button>
            </div>
          </div>

          {/* Chess Board Visual */}
          <div 
            className="mt-20 relative max-w-3xl mx-auto animate-fade-in"
            style={{ animationDelay: '400ms' }}
          >
            <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent z-10" />
            <div className="chess-pattern rounded-2xl aspect-video opacity-30" />
            <div className="absolute inset-0 flex items-center justify-center z-20">
              <ChessKnight className="w-24 h-24 text-primary animate-float" />
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="container mx-auto px-4 py-20 border-t border-border/50">
          <h2 className="text-3xl font-display font-bold text-center mb-12">
            Why Choose <span className="text-gradient">IndiChess</span>?
          </h2>

          <div className="grid md:grid-cols-3 gap-8">
            {features.map((feature, i) => (
              <div
                key={feature.title}
                className="card-glass text-center animate-fade-in"
                style={{ animationDelay: `${i * 100}ms` }}
              >
                <div className="inline-flex p-4 rounded-2xl bg-primary/10 mb-6">
                  <feature.icon className="w-8 h-8 text-primary" />
                </div>
                <h3 className="text-xl font-display font-semibold mb-3">
                  {feature.title}
                </h3>
                <p className="text-muted-foreground">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* CTA Section */}
        <section className="container mx-auto px-4 py-20">
          <div className="card-glass max-w-3xl mx-auto text-center py-12">
            <h2 className="text-3xl font-display font-bold mb-4">
              Ready to Play?
            </h2>
            <p className="text-muted-foreground mb-8">
              Join thousands of chess enthusiasts and start your journey today.
            </p>
            <Button size="lg" variant="gold" asChild>
              <Link to="/register">
                Create Free Account
                <ArrowRight className="w-5 h-5 ml-2" />
              </Link>
            </Button>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-border/50 py-8">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>© 2026 IndiChess. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
