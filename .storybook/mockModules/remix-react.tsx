// Do we need these exports in the stack? I assume yes, but asking just in case
export {
  Link,
  useLocation,
  useCatch,
} from "../../node_modules/@remix-run/react";
import { FormProps } from "../../node_modules/@remix-run/react";
import React from "react";
import { ReactElement } from "react";

// You could return Action data here, though note that
// ALL useActionData calls in all routes rendered in Storybook
// receive the contents of this response
export const useActionData = () => {};

// There are almost certainly more elegant or flexible solutions
// to providing loader data to pages in Storybook, but I
// settled for legibility and shallow call stack depth

// Add your loader parameters necessary for your Storybook stories here
// Using unique variable names in your pages is important
// This might be better commented out with a more generic example for the stack?
export function useLoaderData<T>() {
  return {
    backRoute: "#back",
  };
}

// The purpose of this is two-fold - to centralize
// deactivating forms in Storybook, and to prevent another Remix
// component (Form) from complaining about where it's being rendered
export const Form = (props: FormProps): ReactElement => {
  const { children, method, onSubmit, ...rest } = props;
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
      }}
      {...rest}
    >
      {children}
    </form>
  );
};
