"use client";

import { useActionState, useTransition, type FormEvent } from "react";

/**
 * Runs a server action from a form WITHOUT React 19's automatic form reset.
 * With `<form action={fn}>`, React clears the fields after every submit, including when validation
 * fails, which would throw away what the admin typed. Calling the action from onSubmit avoids that.
 */
export function useFormAction<S>(action: (prev: Awaited<S>, formData: FormData) => Promise<S>, initial: Awaited<S>) {
  const [state, dispatch, actionPending] = useActionState<S, FormData>(action, initial);
  const [transitionPending, startTransition] = useTransition();

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    startTransition(() => dispatch(formData));
  }

  return { state, pending: actionPending || transitionPending, onSubmit };
}
