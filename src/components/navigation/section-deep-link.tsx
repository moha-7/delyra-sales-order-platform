"use client";

import { useEffect } from "react";

function highlight(element: HTMLElement) {
  element.classList.remove("ux-deep-link-highlight");
  void element.offsetWidth;
  element.classList.add("ux-deep-link-highlight");

  window.setTimeout(() => {
    element.classList.remove("ux-deep-link-highlight");
  }, 1900);
}

function currentSection() {
  const params = new URLSearchParams(window.location.search);
  return params.get("section") || window.location.hash.replace(/^#/, "");
}

function scrollToSection() {
  const section = currentSection();
  if (!section) return;
  const element = document.getElementById(section);
  if (!element) return;

  window.setTimeout(() => {
    element.scrollIntoView({ behavior: "smooth", block: "start" });
    highlight(element);
  }, 160);
}

export function SectionDeepLink() {
  useEffect(() => {
    scrollToSection();

    window.addEventListener("hashchange", scrollToSection);
    return () => window.removeEventListener("hashchange", scrollToSection);
  }, []);

  return null;
}
