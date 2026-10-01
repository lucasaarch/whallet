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
  Plus,
  Search,
  Settings,
  Target,
  Wallet,
  Waves,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
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

export default function Home() {
  const [authorization, setAuthorization] = useState<string | null>(null);
  useEffect(
    () => setAuthorization(sessionStorage.getItem("whallet.authorization")),
    [],
  );
  if (!authorization)
    return (
      <Login
        onEnter={(value) => {
          sessionStorage.setItem("whallet.authorization", value);
          setAuthorization(value);
        }}
      />
    );
  return (
    <Dashboard
      authorization={authorization}
      onLogout={() => {
        sessionStorage.removeItem("whallet.authorization");
        setAuthorization(null);
      }}
    />
  );
}

function Logo({ compact = false }: { compact?: boolean }) {
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
        <Logo />
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
            <label className="check">
              <input type="checkbox" /> Lembrar de mim
            </label>
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
  const [summary, setSummary] = useState<Summary[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [offline, setOffline] = useState(false);
  useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        const [nextSummary, nextTransactions] = await Promise.all([
          apiFetch<Summary[]>("/summary", authorization),
          apiFetch<Transaction[]>("/transactions?limit=4", authorization),
        ]);
        if (!alive) return;
        setSummary(nextSummary);
        setTransactions(nextTransactions);
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
        } else
          setError(
            cause instanceof Error
              ? cause.message
              : "Não foi possível carregar o painel.",
          );
      } finally {
        if (alive) setLoading(false);
      }
    };
    load();
    return () => {
      alive = false;
    };
  }, [authorization]);
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
        <Logo compact />
        <nav>
          <Nav icon={LayoutDashboard} active>
            Visão geral
          </Nav>
          <Nav icon={ArrowLeftRight}>Transações</Nav>
          <Nav icon={Wallet}>Contas</Nav>
          <Nav icon={Target}>Orçamentos</Nav>
          <Nav icon={CreditCard}>A pagar e receber</Nav>
        </nav>
        <div className="sidebar-bottom">
          <Nav icon={Settings}>Configurações</Nav>
          <button type="button" className="profile" onClick={onLogout}>
            <span className="avatar">LM</span>
            <span>
              <b>Lucas Martins</b>
              <small>
                <LogOut size={11} /> Sair da conta
              </small>
            </span>
            <ChevronRight size={15} />
          </button>
        </div>
      </aside>
      <section className="dashboard">
        <header>
          <div>
            <p className="eyebrow">visão geral</p>
            <h1>
              Bom dia, Lucas <span>✦</span>
            </h1>
          </div>
          <button type="button" className="round">
            <Search size={17} />
          </button>
          <button type="button" className="notification">
            <Bell size={17} />
            <i />
          </button>
        </header>
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
        <div className="dashboard-grid">
          <section className="balance-card">
            <div className="card-top">
              <span>saldo líquido</span>
              <MoreHorizontal size={17} />
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
              {[
                25, 42, 59, 76, 33, 50, 67, 84, 41, 58, 75, 32, 49, 66, 83, 40,
                57, 74, 31, 48,
              ].map((height) => (
                <i key={height} style={{ height: `${height}%` }} />
              ))}
            </div>
            <div className="card-foot">
              <span>receitas − despesas</span>
              <span>agora</span>
            </div>
          </section>
          <Stat
            icon={ArrowUpRight}
            tone="income-bg"
            label="receitas"
            value={loading ? "—" : money(totals.income, totals.currency)}
          />
          <Stat
            icon={ArrowDownLeft}
            tone="expense-bg"
            label="despesas"
            value={loading ? "—" : money(totals.expense, totals.currency)}
          />
          <section className="panel movements">
            <div className="panel-head">
              <div>
                <h3>Movimentações recentes</h3>
                <p>O que aconteceu com seu dinheiro.</p>
              </div>
              <button type="button" className="link">
                Ver todas <ChevronRight size={14} />
              </button>
            </div>
            {loading ? (
              <LoadingRows />
            ) : (
              (transactions.length ? transactions : fallbackMovements).map(
                (m, index) => {
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
                    <div className="movement" key={"id" in m ? m.id : index}>
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
                },
              )
            )}
          </section>
          <section className="panel goals">
            <div className="panel-head">
              <div>
                <h3>Atalhos</h3>
                <p>Ações rápidas para sua rotina.</p>
              </div>
              <button type="button" className="add">
                <Plus size={16} />
              </button>
            </div>
            <div className="quick-action">
              <ChartNoAxesCombined size={18} />
              <span>
                <b>Resumo financeiro</b>
                <small>
                  {totals.income + totals.expense
                    ? `${summary.length} moeda(s) no período`
                    : "Sem lançamentos ainda"}
                </small>
              </span>
              <ChevronRight size={15} />
            </div>
            <div className="quick-action">
              <CreditCard size={18} />
              <span>
                <b>Contas a pagar e receber</b>
                <small>Veja seus próximos vencimentos</small>
              </span>
              <ChevronRight size={15} />
            </div>
          </section>
        </div>
      </section>
    </main>
  );
}
function Nav({
  icon: Icon,
  children,
  active = false,
}: {
  icon: typeof LayoutDashboard;
  children: React.ReactNode;
  active?: boolean;
}) {
  return (
    <button type="button" className={active ? "nav-active" : ""}>
      <Icon size={17} /> {children}
    </button>
  );
}
function Stat({
  icon: Icon,
  tone,
  label,
  value,
}: { icon: typeof ArrowUpRight; tone: string; label: string; value: string }) {
  return (
    <section className="stat-card">
      <div className="stat-head">
        <span className={`stat-icon ${tone}`}>
          <Icon size={15} />
        </span>
        <span>{label}</span>
        <MoreHorizontal size={17} />
      </div>
      <strong>{value}</strong>
      <p className="positive">
        dados reais <small>da API</small>
      </p>
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
