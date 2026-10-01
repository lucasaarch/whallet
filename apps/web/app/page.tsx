"use client";

import {
  ArrowDownLeft,
  ArrowLeftRight,
  ArrowUpRight,
  Bell,
  ChartNoAxesCombined,
  ChevronRight,
  CircleHelp,
  CreditCard,
  LayoutDashboard,
  LoaderCircle,
  LogOut,
  MoreHorizontal,
  Search,
  Settings,
  Target,
  Wallet,
  Waves,
  X,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { type Summary, type Transaction, apiFetch } from "./api";

const fallbackMovements = [
  {
    title: "Nenhuma movimentação",
    meta: "Seus lançamentos aparecerão aqui",
    amount: "—",
    tone: "neutral",
    icon: ArrowLeftRight,
  },
];

type View =
  | "overview"
  | "transactions"
  | "accounts"
  | "budgets"
  | "obligations"
  | "settings";

export default function Home() {
  const [authorization, setAuthorization] = useState<string | null>(null);
  useEffect(
    () =>
      setAuthorization(
        localStorage.getItem("whallet.authorization") ??
          sessionStorage.getItem("whallet.authorization"),
      ),
    [],
  );
  if (!authorization)
    return (
      <Login
        onEnter={(value) => {
          localStorage.setItem("whallet.authorization", value);
          setAuthorization(value);
        }}
      />
    );
  return (
    <Dashboard
      authorization={authorization}
      onLogout={() => {
        localStorage.removeItem("whallet.authorization");
        sessionStorage.removeItem("whallet.authorization");
        setAuthorization(null);
      }}
    />
  );
}

function Logo({
  compact = false,
  dark = false,
}: { compact?: boolean; dark?: boolean }) {
  return (
    <div className={`brand ${compact ? "brand-compact" : ""}`}>
      <img src="/whallet-mark.png" alt="" />
      <span>
        whallet<span className="dot">.</span>
      </span>
    </div>
  );
}

function Login({ onEnter }: { onEnter: (authorization: string) => void }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function signIn(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const authorization = `Basic ${btoa(`${username}:${password}`)}`;
    try {
      const response = await fetch("/api/session", {
        headers: { authorization },
      });
      if (!response.ok) throw new Error("Usuário ou senha inválidos.");
      onEnter(authorization);
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Não foi possível entrar.",
      );
      setBusy(false);
    }
  }
  return (
    <main className="login-shell">
      <section className="login-art">
        <Logo dark />
        <div className="art-copy">
          <p className="eyebrow">seu dinheiro, em movimento</p>
          <h1>
            Faça o dinheiro
            <br />
            <em>trabalhar por você.</em>
          </h1>
          <p className="art-muted">
            Clareza para decidir. Controle para crescer.
          </p>
        </div>
        <div className="art-orbit">
          <span>R$</span>
          <span>↗</span>
          <span>+</span>
        </div>
        <p className="art-footer">
          © 2026 Whallet · Feito para quem faz acontecer
        </p>
      </section>
      <section className="login-form">
        <div className="mobile-login-brand">
          <Logo />
        </div>
        <form className="form-inner" onSubmit={signIn}>
          <p className="eyebrow">acesso seguro</p>
          <h2>
            Entre na sua
            <br />
            <span>conta.</span>
          </h2>
          <p className="form-muted">Use o usuário configurado no servidor.</p>
          <label>
            Usuário
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
              placeholder="seu usuário"
              required
            />
          </label>
          <label>
            Senha
            <div className="password">
              <input
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                type="password"
                placeholder="••••••••"
                required
              />
              <span>◉</span>
            </div>
          </label>
          <div className="form-row">
            <span className="check">
              Sua sessão será salva neste dispositivo.
            </span>
          </div>
          <button type="submit" className="primary" disabled={busy}>
            {busy ? <LoaderCircle className="spin" size={17} /> : "Entrar"}{" "}
            <span>→</span>
          </button>
          {error && <p className="login-error">{error}</p>}
        </form>
      </section>
    </main>
  );
}

function money(minor: number, currency = "BRL") {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency }).format(
    (minor || 0) / 100,
  );
}
function Dashboard({
  authorization,
  onLogout,
}: { authorization: string; onLogout: () => void }) {
  const [view, setView] = useState<View>("overview");
  const [summary, setSummary] = useState<Summary[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [offline, setOffline] = useState(false);
  const navigate = useCallback((next: View) => {
    setView(next);
  }, []);
  const loadDashboard = useCallback(
    async (showLoading = true) => {
      if (showLoading) setLoading(true);
      try {
        const [nextSummary, nextTransactions] = await Promise.all([
          apiFetch<Summary[]>("/summary", authorization),
          apiFetch<Transaction[]>("/transactions?limit=8", authorization),
        ]);
        setSummary(nextSummary);
        setTransactions(nextTransactions);
        setOffline(false);
        setError("");
        localStorage.setItem(
          "whallet.dashboard",
          JSON.stringify({
            summary: nextSummary,
            transactions: nextTransactions,
          }),
        );
      } catch (cause) {
        const cached = localStorage.getItem("whallet.dashboard");
        if (cached) {
          const data = JSON.parse(cached);
          setSummary(data.summary ?? []);
          setTransactions(data.transactions ?? []);
          setOffline(true);
        } else {
          setError(
            cause instanceof Error
              ? cause.message
              : "Não foi possível carregar o painel.",
          );
        }
      } finally {
        setLoading(false);
      }
    },
    [authorization],
  );
  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);
  useEffect(() => {
    const controller = new AbortController();
    let buffer = "";
    const listen = async () => {
      try {
        const response = await fetch("/api/events", {
          headers: { authorization, Accept: "text/event-stream" },
          cache: "no-store",
          signal: controller.signal,
        });
        if (!response.ok || !response.body) throw new Error("SSE unavailable");
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        while (!controller.signal.aborted) {
          const { value, done } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const events = buffer.split("\n\n");
          buffer = events.pop() ?? "";
          if (events.some((event) => event.includes("dashboard.updated")))
            await loadDashboard(false);
        }
      } catch {}
    };
    listen();
    return () => controller.abort();
  }, [authorization, loadDashboard]);
  const totals = summary.reduce(
    (acc, row) => ({
      income: acc.income + Number(row.incomeMinor || 0),
      expense: acc.expense + Number(row.expenseMinor || 0),
      net: acc.net + Number(row.netMinor || 0),
      currency: row.currency,
    }),
    { income: 0, expense: 0, net: 0, currency: "BRL" },
  );
  return (
    <main className="app-shell">
      <aside>
        <Logo compact dark />
        <nav>
          <Nav
            icon={LayoutDashboard}
            active={view === "overview"}
            onClick={() => navigate("overview")}
          >
            Visão geral
          </Nav>
          <Nav
            icon={ArrowLeftRight}
            active={view === "transactions"}
            onClick={() => navigate("transactions")}
          >
            Transações
          </Nav>
          <Nav
            icon={Wallet}
            active={view === "accounts"}
            onClick={() => navigate("accounts")}
          >
            Contas
          </Nav>
          <Nav
            icon={Target}
            active={view === "budgets"}
            onClick={() => navigate("budgets")}
          >
            Orçamentos
          </Nav>
          <Nav
            icon={CreditCard}
            active={view === "obligations"}
            onClick={() => navigate("obligations")}
          >
            A pagar e receber
          </Nav>
        </nav>
        <div className="sidebar-bottom">
          <Nav
            icon={Settings}
            active={view === "settings"}
            onClick={() => navigate("settings")}
          >
            Configurações
          </Nav>
          <button type="button" className="logout-button" onClick={onLogout}>
            <LogOut size={16} />
            Sair da conta
          </button>
        </div>
      </aside>
      <section className="dashboard">
        <header className="shell-header">
          <div className="shell-header-actions">
            <button type="button" className="round">
              <Search size={17} />
            </button>
            <button type="button" className="notification">
              <Bell size={17} />
              <i />
            </button>
          </div>
        </header>
        <div className="dashboard-content">
          {offline && (
            <div className="offline-bar">
              <Waves size={15} /> Exibindo os últimos dados salvos. Você está
              offline.
            </div>
          )}
          {error && (
            <div className="error-bar">
              <CircleHelp size={15} /> {error}
              <button type="button" onClick={() => location.reload()}>
                <X size={14} />
              </button>
            </div>
          )}
          {view !== "overview" ? (
            <WorkspaceView view={view} onBack={() => navigate("overview")} />
          ) : (
            <>
              <QuickActions
                summaryCount={summary.length}
                hasTransactions={Boolean(totals.income + totals.expense)}
                onNavigate={navigate}
              />
              <div className="dashboard-grid">
                <section className="balance-card">
                  <div className="card-top">
                    <span>saldo líquido</span>
                    <button
                      type="button"
                      className="card-link"
                      aria-label="Abrir transações"
                      onClick={() => navigate("transactions")}
                    >
                      <ChevronRight size={14} />
                    </button>
                  </div>
                  <strong>
                    {loading ? (
                      <LoaderCircle className="spin" />
                    ) : (
                      money(totals.net, totals.currency)
                    )}
                  </strong>
                  <p className={totals.net >= 0 ? "positive" : "negative"}>
                    <ArrowUpRight size={14} /> período atual
                  </p>
                  <div className="balance-chart">
                    <ResponsiveContainer width="100%" height={130}>
                      <AreaChart
                        data={transactions
                          .slice()
                          .reverse()
                          .map((transaction, index) => ({
                            label: index + 1,
                            value:
                              transaction.type === "expense"
                                ? -transaction.amountMinor
                                : transaction.amountMinor,
                          }))}
                      >
                        <defs>
                          <linearGradient
                            id="balanceFill"
                            x1="0"
                            y1="0"
                            x2="0"
                            y2="1"
                          >
                            <stop
                              offset="0%"
                              stopColor="#f5f5f3"
                              stopOpacity={0.65}
                            />
                            <stop
                              offset="100%"
                              stopColor="#f5f5f3"
                              stopOpacity={0}
                            />
                          </linearGradient>
                        </defs>
                        <XAxis dataKey="label" hide />
                        <YAxis hide domain={["auto", "auto"]} />
                        <CartesianGrid vertical={false} stroke="#252a3b" />
                        <Tooltip
                          contentStyle={{
                            background: "#191b22",
                            border: "1px solid #333",
                            borderRadius: 8,
                            color: "#fff",
                          }}
                          formatter={(value) =>
                            money(Number(value), totals.currency)
                          }
                          labelFormatter={() => "movimentação"}
                        />
                        <Area
                          type="monotone"
                          dataKey="value"
                          stroke="#f5f5f3"
                          strokeWidth={2}
                          fill="url(#balanceFill)"
                          connectNulls
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="card-foot">
                    <span>receitas − despesas</span>
                    <span>agora</span>
                  </div>
                  <div className="balance-details">
                    <div>
                      <span>movimentações</span>
                      <strong>{transactions.length}</strong>
                    </div>
                    <div>
                      <span>moedas</span>
                      <strong>{summary.length}</strong>
                    </div>
                  </div>
                </section>
                <Stat
                  icon={ArrowUpRight}
                  tone="income-bg"
                  label="receitas"
                  value={loading ? "—" : money(totals.income, totals.currency)}
                  onNavigate={() => navigate("transactions")}
                />
                <Stat
                  icon={ArrowDownLeft}
                  tone="expense-bg"
                  label="despesas"
                  value={loading ? "—" : money(totals.expense, totals.currency)}
                  onNavigate={() => navigate("transactions")}
                />
                <section className="panel movements">
                  <div className="panel-head">
                    <div>
                      <h3>Movimentações recentes</h3>
                      <p>O que aconteceu com seu dinheiro.</p>
                    </div>
                    <button
                      type="button"
                      className="link"
                      onClick={() => navigate("transactions")}
                    >
                      Ver todas <ChevronRight size={14} />
                    </button>
                  </div>
                  {loading ? (
                    <LoadingRows />
                  ) : (
                    (transactions.length
                      ? transactions
                      : fallbackMovements
                    ).map((m, index) => {
                      const Icon =
                        "icon" in m
                          ? m.icon
                          : m.type === "income"
                            ? ArrowUpRight
                            : m.type === "expense"
                              ? ArrowDownLeft
                              : ArrowLeftRight;
                      const tone = "tone" in m ? m.tone : m.type;
                      return (
                        <div
                          className="movement"
                          key={"id" in m ? m.id : index}
                        >
                          <span className={`movement-icon ${tone}`}>
                            <Icon size={15} />
                          </span>
                          <span className="movement-info">
                            <b>{"title" in m ? m.title : m.description}</b>
                            <small>
                              {"meta" in m
                                ? m.meta
                                : new Date(m.occurredAt).toLocaleDateString(
                                    "pt-BR",
                                  )}
                            </small>
                          </span>
                          <strong className={tone}>
                            {"amount" in m
                              ? m.amount
                              : `${m.type === "income" ? "+" : m.type === "expense" ? "−" : ""} ${money(m.amountMinor, m.currency)}`}
                          </strong>
                        </div>
                      );
                    })
                  )}
                </section>
              </div>
            </>
          )}
        </div>
      </section>
      <nav className="bottom-bar" aria-label="Navegação principal">
        <Nav
          icon={LayoutDashboard}
          active={view === "overview"}
          onClick={() => navigate("overview")}
        >
          Início
        </Nav>
        <Nav
          icon={ArrowLeftRight}
          active={view === "transactions"}
          onClick={() => navigate("transactions")}
        >
          Transações
        </Nav>
        <Nav
          icon={Wallet}
          active={view === "accounts"}
          onClick={() => navigate("accounts")}
        >
          Contas
        </Nav>
        <Nav
          icon={MoreHorizontal}
          active={view === "settings"}
          onClick={() => navigate("settings")}
        >
          Mais
        </Nav>
      </nav>
    </main>
  );
}
function Nav({
  icon: Icon,
  children,
  active = false,
  onClick,
}: {
  icon: typeof LayoutDashboard;
  children: React.ReactNode;
  active?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      className={active ? "nav-active" : ""}
      onClick={onClick}
    >
      <Icon size={17} /> {children}
    </button>
  );
}

function WorkspaceView({
  view,
  onBack,
}: { view: Exclude<View, "overview">; onBack: () => void }) {
  const content: Record<
    Exclude<View, "overview">,
    { title: string; eyebrow: string; description: string; icon: typeof Wallet }
  > = {
    transactions: {
      title: "Transações",
      eyebrow: "movimentações",
      description:
        "Acompanhe entradas, saídas e transferências em um só lugar.",
      icon: ArrowLeftRight,
    },
    accounts: {
      title: "Contas",
      eyebrow: "patrimônio",
      description: "Organize suas contas e veja onde seu dinheiro está.",
      icon: Wallet,
    },
    budgets: {
      title: "Orçamentos",
      eyebrow: "planejamento",
      description: "Defina limites por categoria e acompanhe seu ritmo.",
      icon: Target,
    },
    obligations: {
      title: "A pagar e receber",
      eyebrow: "compromissos",
      description: "Veja vencimentos próximos e mantenha o caixa previsível.",
      icon: CreditCard,
    },
    settings: {
      title: "Configurações",
      eyebrow: "preferências",
      description: "Ajuste sua experiência no Whallet.",
      icon: Settings,
    },
  };
  const page = content[view];
  const Icon = page.icon;
  return (
    <section className="workspace-view">
      <div className="workspace-hero">
        <span className="workspace-icon">
          <Icon size={22} />
        </span>
        <div>
          <p className="eyebrow">{page.eyebrow}</p>
          <h2>{page.title}</h2>
          <p>{page.description}</p>
        </div>
      </div>
      <div className="workspace-cards">
        <article>
          <b>Pronto para começar?</b>
          <span>Esta área já está preparada para receber seus dados.</span>
          <button type="button" className="primary" onClick={onBack}>
            Voltar para visão geral <ChevronRight size={16} />
          </button>
        </article>
        <article>
          <span className="workspace-number">01</span>
          <b>Dados conectados</b>
          <span>
            O painel é atualizado automaticamente quando houver novas
            movimentações.
          </span>
        </article>
      </div>
    </section>
  );
}
function Stat({
  icon: Icon,
  tone,
  label,
  value,
  onNavigate,
}: {
  icon: typeof ArrowUpRight;
  tone: string;
  label: string;
  value: string;
  onNavigate: () => void;
}) {
  return (
    <section className="stat-card">
      <div className="stat-head">
        <span className={`stat-icon ${tone}`}>
          <Icon size={15} />
        </span>
        <span>{label}</span>
        <button
          type="button"
          className="card-link"
          aria-label={`Abrir transações de ${label}`}
          onClick={onNavigate}
        >
          <ChevronRight size={14} />
        </button>
      </div>
      <strong>{value}</strong>
      <p className="positive">
        dados reais <small>da API</small>
      </p>
    </section>
  );
}

function QuickActions({
  summaryCount,
  hasTransactions,
  onNavigate,
}: {
  summaryCount: number;
  hasTransactions: boolean;
  onNavigate: (view: View) => void;
}) {
  return (
    <section className="quick-actions" aria-label="Atalhos">
      <button type="button" onClick={() => onNavigate("transactions")}>
        <ChartNoAxesCombined size={18} />
        <span>
          <b>Resumo financeiro</b>
          <small>
            {hasTransactions
              ? `${summaryCount} moeda(s) no período`
              : "Sem lançamentos ainda"}
          </small>
        </span>
        <ChevronRight size={15} />
      </button>
      <button type="button" onClick={() => onNavigate("obligations")}>
        <CreditCard size={18} />
        <span>
          <b>Contas a pagar e receber</b>
          <small>Veja seus próximos vencimentos</small>
        </span>
        <ChevronRight size={15} />
      </button>
    </section>
  );
}

function LoadingRows() {
  return (
    <>
      {[1, 2, 3].map((i) => (
        <div className="movement skeleton" key={i}>
          <span />
          <span />
          <strong />
        </div>
      ))}
    </>
  );
}
