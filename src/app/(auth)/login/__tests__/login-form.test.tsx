import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock("@/lib/auth/actions", () => ({
  login: vi.fn(),
  register: vi.fn(),
}));

// React 19 useActionState mock - spread actual module to preserve useState etc.
vi.mock("react", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react")>();
  return {
    ...actual,
    useActionState: (action: Function, _init: unknown) => [undefined, action, false],
  };
});

import { LoginForm } from "../login-form";

afterEach(() => {
  cleanup();
});

describe("LoginForm", () => {
  it("renders login mode by default", () => {
    render(<LoginForm />);

    expect(screen.getByLabelText("Email")).toBeInTheDocument();
    expect(screen.getByLabelText("Password")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Sign in" })).toBeInTheDocument();
    expect(screen.queryByLabelText("Name")).not.toBeInTheDocument();
  });

  it("renders Google sign-in link pointing to /api/auth/google", () => {
    render(<LoginForm />);
    const link = screen.getByRole("link");
    expect(link).toHaveAttribute("href", "/api/auth/google");
    expect(link).toHaveTextContent(/Continue with Google/i);
  });

  it("switches to register mode", async () => {
    const user = userEvent.setup();
    render(<LoginForm />);

    const signUpButtons = screen.getAllByRole("button", { name: "Sign up" });
    await user.click(signUpButtons[0]);

    expect(screen.getByLabelText("Name")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Create account" })).toBeInTheDocument();
  });

  it("switches back to login mode", async () => {
    const user = userEvent.setup();
    render(<LoginForm />);

    const signUpButtons = screen.getAllByRole("button", { name: "Sign up" });
    await user.click(signUpButtons[0]);

    const signInButtons = screen.getAllByRole("button", { name: "Sign in" });
    await user.click(signInButtons[0]);

    expect(screen.queryByLabelText("Name")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Sign in" })).toBeInTheDocument();
  });

  it("has correct form inputs with proper types", () => {
    render(<LoginForm />);

    const emailInput = screen.getByLabelText("Email");
    expect(emailInput).toHaveAttribute("type", "email");
    expect(emailInput).toHaveAttribute("name", "email");

    const passwordInput = screen.getByLabelText("Password");
    expect(passwordInput).toHaveAttribute("type", "password");
    expect(passwordInput).toHaveAttribute("name", "password");
  });
});
