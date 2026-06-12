/**
 * Global navigation header — re-exports {@link SiteHeader} under the Navbar alias
 * for layout trees that reference `components/Navbar.tsx`.
 */
export {
  SiteHeader as Navbar,
  type SiteHeaderProps as NavbarProps,
} from './brand/SiteHeader';
