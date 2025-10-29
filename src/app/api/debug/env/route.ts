import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function GET() {
  try {
    const STORAGE_TYPE = (process.env.NEXT_PUBLIC_STORAGE_TYPE || 'localstorage').toString();
    const USERNAME = process.env.USERNAME || null;
    const PASSWORD_SET = Boolean(process.env.PASSWORD);
    const NODE_ENV = process.env.NODE_ENV || 'development';

    return NextResponse.json({
      ok: true,
      NODE_ENV,
      STORAGE_TYPE,
      USERNAME,
      PASSWORD_SET,
    });
  } catch (e) {
    return NextResponse.json({ ok: false, error: (e as Error).message }, { status: 500 });
  }
}