import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { getLoginUrl } from "@/const";
import {
  Search,
  Zap,
  TrendingUp,
  DollarSign,
  Users,
  MessageSquare,
  BarChart3,
  Sparkles,
  ArrowRight,
  CheckCircle,
} from "lucide-react";
import { Link } from "wouter";

export default function Home() {
  const { isAuthenticated } = useAuth();

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Navigation */}
      <nav className="border-b border-muted bg-background/80 backdrop-blur-md sticky top-0 z-50">
        <div className="container flex items-center justify-between py-4">
          <div className="flex items-center gap-2">
            <Sparkles className="w-8 h-8 text-primary" />
            <span className="text-2xl font-bold font-sora gradient-text">DropHunter AI</span>
          </div>
          <div className="flex items-center gap-4">
            {isAuthenticated ? (
              <Link href="/dashboard">
                <Button className="btn-primary">Go to Dashboard</Button>
              </Link>
            ) : (
              <a href={getLoginUrl()}>
                <Button className="btn-primary">Get Started</Button>
              </a>
            )}
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="container py-24 md:py-32">
        <div className="max-w-4xl mx-auto text-center animate-in">
          <h1 className="text-5xl md:text-6xl font-bold mb-6 gradient-text">
            Discover Winning Products, Faster
          </h1>
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            The all-in-one platform for dropshippers to research, validate, and launch winning products across eBay, Amazon, Shopify, and TikTok Shop.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            {isAuthenticated ? (
              <Link href="/dashboard">
                <Button className="btn-primary text-lg px-8 py-6">
                  Open Dashboard <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              </Link>
            ) : (
              <a href={getLoginUrl()}>
                <Button className="btn-primary text-lg px-8 py-6">
                  Start Free Trial <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              </a>
            )}
            <Button className="btn-secondary text-lg px-8 py-6">Learn More</Button>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="container py-24">
        <h2 className="text-4xl font-bold text-center mb-16">Powerful Features</h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[
            {
              icon: Search,
              title: "Multi-Platform Search",
              desc: "Search eBay, Amazon, Shopify & TikTok Shop simultaneously with advanced filters",
            },
            {
              icon: Zap,
              title: "AI Validation Engine",
              desc: "Score products on trend momentum, saturation, profit potential & supplier reliability",
            },
            {
              icon: Users,
              title: "Competitor Spy",
              desc: "Analyze competitor listings, pricing strategies, reviews & sales velocity",
            },
            {
              icon: DollarSign,
              title: "Profit Calculator",
              desc: "Full landed cost breakdown with ROI & break-even analysis",
            },
            {
              icon: TrendingUp,
              title: "Market Gap Finder",
              desc: "Identify underserved niches with high demand & low competition",
            },
            {
              icon: MessageSquare,
              title: "AI Agent Chat",
              desc: "Conversational research advisor powered by advanced LLM",
            },
            {
              icon: BarChart3,
              title: "Analytics Dashboard",
              desc: "Track pipeline, trends, and performance metrics over time",
            },
            {
              icon: Sparkles,
              title: "Social Media Kit",
              desc: "AI-generated hashtags, ad copy, captions & video scripts",
            },
            {
              icon: Users,
              title: "Supplier Vetting",
              desc: "Location, shipping times, MOQ, reliability scores & sample tracker",
            },
          ].map((feature, idx) => (
            <Card key={idx} className="card-elevated group">
              <feature.icon className="w-12 h-12 text-primary mb-4 group-hover:scale-110 transition-transform" />
              <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
              <p className="text-muted-foreground">{feature.desc}</p>
            </Card>
          ))}
        </div>
      </section>

      {/* Pricing Section */}
      <section className="container py-24">
        <h2 className="text-4xl font-bold text-center mb-16">Simple Pricing</h2>
        <div className="grid md:grid-cols-4 gap-6">
          {[
            {
              name: "Starter",
              price: "$29",
              features: ["Basic search", "100 searches/mo", "Margin calculator", "Hashtag generator"],
            },
            {
              name: "Pro",
              price: "$79",
              features: ["All platforms", "Competitor spy", "AI trend predictor", "1-click import", "500 searches"],
              highlight: true,
            },
            {
              name: "Agency",
              price: "$199",
              features: ["Multi-client accounts", "White-label reports", "Unlimited searches", "P&L dashboard"],
            },
            {
              name: "Enterprise",
              price: "$499",
              features: ["Custom API access", "HS code compliance", "Supplier vetting team", "Dedicated support"],
            },
          ].map((tier, idx) => (
            <Card
              key={idx}
              className={`card-elevated flex flex-col ${tier.highlight ? "ring-2 ring-primary scale-105" : ""}`}
            >
              <h3 className="text-2xl font-bold mb-2">{tier.name}</h3>
              <div className="text-4xl font-bold gradient-text mb-6">{tier.price}</div>
              <ul className="space-y-3 flex-1">
                {tier.features.map((feature, fidx) => (
                  <li key={fidx} className="flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-primary flex-shrink-0" />
                    <span className="text-sm">{feature}</span>
                  </li>
                ))}
              </ul>
              <Button className="btn-primary w-full mt-6">Get Started</Button>
            </Card>
          ))}
        </div>
      </section>

      {/* CTA Section */}
      <section className="container py-24">
        <div className="glass-effect p-12 text-center">
          <h2 className="text-4xl font-bold mb-6">Ready to Find Your Next Winning Product?</h2>
          <p className="text-xl text-muted-foreground mb-8">
            Join thousands of dropshippers using DropHunter AI to scale their businesses
          </p>
          {isAuthenticated ? (
            <Link href="/dashboard">
              <Button className="btn-primary text-lg px-8 py-6">
                Go to Dashboard <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </Link>
          ) : (
            <a href={getLoginUrl()}>
              <Button className="btn-primary text-lg px-8 py-6">
                Start Free Trial <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </a>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-muted bg-card/50 py-12">
        <div className="container">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Sparkles className="w-6 h-6 text-primary" />
                <span className="font-bold">DropHunter AI</span>
              </div>
              <p className="text-sm text-muted-foreground">The all-in-one product research platform</p>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Product</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="#" className="hover:text-primary transition">Features</a></li>
                <li><a href="#" className="hover:text-primary transition">Pricing</a></li>
                <li><a href="#" className="hover:text-primary transition">Blog</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Company</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="#" className="hover:text-primary transition">About</a></li>
                <li><a href="#" className="hover:text-primary transition">Contact</a></li>
                <li><a href="#" className="hover:text-primary transition">Support</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Legal</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="#" className="hover:text-primary transition">Privacy</a></li>
                <li><a href="#" className="hover:text-primary transition">Terms</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-muted pt-8 text-center text-sm text-muted-foreground">
            <p>&copy; 2026 DropHunter AI. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
