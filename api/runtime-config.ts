export default function handler(
  _req: unknown,
  res: {
    status: (code: number) => { json: (payload: unknown) => void };
  }
) {
  const supabaseUrl = process.env.VITE_SUPABASE_URL?.trim() ?? "";
  const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY?.trim() ?? "";

  res.status(200).json({
    supabaseUrl,
    supabaseAnonKey
  });
}
