import Form from "next/form";

export function SearchBox({ initial = "", autoFocus = false }: { initial?: string; autoFocus?: boolean }) {
  return (
    <Form action="/search" className="flex gap-2 max-w-[560px]">
      <label className="sr-only" htmlFor="q">Search shows and movies</label>
      <input
        id="q"
        name="q"
        type="search"
        defaultValue={initial}
        autoFocus={autoFocus}
        placeholder="Search shows and movies"
        className="field"
        autoComplete="off"
      />
      <button className="btn" type="submit">Search</button>
    </Form>
  );
}
