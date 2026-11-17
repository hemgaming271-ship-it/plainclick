import { ButtonLink, Container } from "@/components/ui";

export default function NotFound() {
  return (
    <Container className="py-20">
      <h1 className="text-3xl font-bold">Page not found</h1>
      <p className="mt-3 text-lg text-muted">That page doesn&apos;t exist.</p>
      <div className="mt-6">
        <ButtonLink href="/">Go to the home page</ButtonLink>
      </div>
    </Container>
  );
}
