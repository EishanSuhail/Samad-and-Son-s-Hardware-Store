export function PolicyPage({ title, sections }: { title: string; sections: { heading: string; body: string[] }[] }) {
  return (
    <div className="mx-auto max-w-3xl px-4 pt-12 sm:px-6">
      <h1 className="text-3xl font-extrabold sm:text-4xl">{title}</h1>
      <div className="mt-8 space-y-8">
        {sections.map((s) => (
          <section key={s.heading}>
            <h2 className="text-xl font-bold">{s.heading}</h2>
            <div className="mt-2 space-y-3 leading-relaxed text-ink/90">
              {s.body.map((p, i) => (
                <p key={i}>{p}</p>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
