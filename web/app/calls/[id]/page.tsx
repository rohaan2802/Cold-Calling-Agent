import CallDetail from "@/components/CallDetail";

type Props = { params: Promise<{ id: string }> };

export default async function CallDetailPage({ params }: Props) {
  const { id } = await params;
  return (
    <main>
      <CallDetail id={id} />
    </main>
  );
}
