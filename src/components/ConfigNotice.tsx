export function ConfigNotice({ message }: { message?: string }) {
  return (
    <div className="page">
      <div className="config-notice">
        <h1>설정이 필요해요</h1>
        <p>Supabase 연결 정보가 아직 없어요. 프로젝트 루트의 <code>.env</code> 파일에 아래 값을 채워주세요.</p>
        <pre>{`VITE_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co\nVITE_SUPABASE_ANON_KEY=YOUR_ANON_KEY`}</pre>
        <p className="hint">
          Supabase 대시보드 → Project Settings → API 에서 URL과 anon key를 확인할 수 있어요.
          <br />
          그리고 <code>supabase/schema.sql</code> 파일 내용을 Supabase SQL Editor에서 실행해주세요.
          <br />
          이미 예전 버전으로 만든 DB라면 <code>supabase/migration_shared_access.sql</code> 도 실행해주세요.
        </p>
        {message && message !== 'not-configured' && <p className="form-error">{message}</p>}
      </div>
    </div>
  );
}
