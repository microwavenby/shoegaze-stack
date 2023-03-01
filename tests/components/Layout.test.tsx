import Layout from "app/components/Layout";
import { renderWithRouter } from "tests/helpers/setup";

import { testAccessibility } from "../helpers/sharedTests";

it("should match snapshot", () => {
  const { container } = renderWithRouter(
    <Layout children={<h1>'child'</h1>} />
  );
  expect(container).toMatchSnapshot();
});

it("should pass accessibility scan", async () => {
  await testAccessibility(<Layout children={<h1>'child'</h1>} />);
});
