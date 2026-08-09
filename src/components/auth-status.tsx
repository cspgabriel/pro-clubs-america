"use client";
import Link from "next/link";
import { LogIn, UserRound } from "lucide-react";
import { useEffect, useState } from "react";
import { observeAuth, type AuthUserSnapshot } from "@/lib/auth-client";
export function AuthStatus() { const [user, setUser] = useState<AuthUserSnapshot | null>(null); useEffect(() => observeAuth(setUser), []); return user ? <Link className="auth-status" href="/conta"><UserRound /><span>{user.name}</span></Link> : <Link className="auth-status" href="/entrar"><LogIn /><span>Entrar</span></Link>; }
