import { Card } from "@/components/ui/card";
import { BarChart3, TrendingUp, DollarSign, Eye } from "lucide-react";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

const trendData = [
  { month: "Jan", searches: 400, views: 2400, sales: 2400 },
  { month: "Feb", searches: 520, views: 2210, sales: 2290 },
  { month: "Mar", searches: 680, views: 2290, sales: 2000 },
  { month: "Apr", searches: 890, views: 2000, sales: 2181 },
  { month: "May", searches: 1200, views: 2181, sales: 2500 },
  { month: "Jun", searches: 1450, views: 2500, sales: 2100 },
];

const profitData = [
  { product: "Wireless Earbuds", profit: 1200, revenue: 3400 },
  { product: "Phone Stand", profit: 800, revenue: 2100 },
  { product: "USB Hub", profit: 950, revenue: 2800 },
  { product: "Screen Protector", profit: 650, revenue: 1900 },
  { product: "Phone Case", profit: 1100, revenue: 3200 },
];

export default function AnalyticsDashboard() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-4xl font-bold mb-2">Analytics Dashboard</h1>
        <p className="text-muted-foreground">Track performance and trends across your product pipeline</p>
      </div>

      {/* Key Metrics */}
      <div className="grid md:grid-cols-4 gap-4">
        <Card className="card-elevated p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Total Revenue</p>
              <p className="text-3xl font-bold gradient-text">$28,450</p>
            </div>
            <DollarSign className="w-8 h-8 text-primary opacity-50" />
          </div>
        </Card>

        <Card className="card-elevated p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Total Profit</p>
              <p className="text-3xl font-bold text-green-400">$12,890</p>
            </div>
            <TrendingUp className="w-8 h-8 text-green-400 opacity-50" />
          </div>
        </Card>

        <Card className="card-elevated p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Avg Margin</p>
              <p className="text-3xl font-bold text-blue-400">45.2%</p>
            </div>
            <BarChart3 className="w-8 h-8 text-blue-400 opacity-50" />
          </div>
        </Card>

        <Card className="card-elevated p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Active Products</p>
              <p className="text-3xl font-bold text-accent">12</p>
            </div>
            <Eye className="w-8 h-8 text-accent opacity-50" />
          </div>
        </Card>
      </div>

      {/* Trend Chart */}
      <Card className="card-elevated p-6">
        <h3 className="text-xl font-semibold mb-4">Search Trends & Performance</h3>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={trendData}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
            <XAxis dataKey="month" stroke="rgba(255,255,255,0.5)" />
            <YAxis stroke="rgba(255,255,255,0.5)" />
            <Tooltip contentStyle={{ backgroundColor: "#1a1a2e", border: "1px solid #16213e" }} />
            <Legend />
            <Line type="monotone" dataKey="searches" stroke="#8b5cf6" strokeWidth={2} />
            <Line type="monotone" dataKey="views" stroke="#3b82f6" strokeWidth={2} />
            <Line type="monotone" dataKey="sales" stroke="#10b981" strokeWidth={2} />
          </LineChart>
        </ResponsiveContainer>
      </Card>

      {/* Profit by Product */}
      <Card className="card-elevated p-6">
        <h3 className="text-xl font-semibold mb-4">Profit by Product</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={profitData}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
            <XAxis dataKey="product" stroke="rgba(255,255,255,0.5)" />
            <YAxis stroke="rgba(255,255,255,0.5)" />
            <Tooltip contentStyle={{ backgroundColor: "#1a1a2e", border: "1px solid #16213e" }} />
            <Legend />
            <Bar dataKey="revenue" fill="#3b82f6" />
            <Bar dataKey="profit" fill="#10b981" />
          </BarChart>
        </ResponsiveContainer>
      </Card>

      {/* Pipeline Status */}
      <div className="grid md:grid-cols-4 gap-4">
        {[
          { label: "Testing", count: 5, color: "bg-blue-500/10 text-blue-400" },
          { label: "Scaling", count: 3, color: "bg-green-500/10 text-green-400" },
          { label: "Paused", count: 2, color: "bg-yellow-500/10 text-yellow-400" },
          { label: "Dropped", count: 2, color: "bg-red-500/10 text-red-400" },
        ].map((stage) => (
          <Card key={stage.label} className={`card-elevated p-6 ${stage.color}`}>
            <p className="text-sm font-semibold mb-2">{stage.label}</p>
            <p className="text-3xl font-bold">{stage.count}</p>
          </Card>
        ))}
      </div>
    </div>
  );
}
