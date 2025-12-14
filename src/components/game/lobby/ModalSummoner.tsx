import Link from "next/link";
import CreateGameModal from "@comps/game/lobby/CreateGameModal";

type SearchParamProps = {
  searchParams: Record<string, string> | null | undefined;
};

export default function Page({ searchParams }: SearchParamProps) {
  const show = searchParams?.show;

  return (
    <>
      <Link href="/?show=true">
        Create New Game
      </Link>

      {show && <CreateGameModal />}
    </>
  );
}