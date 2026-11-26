import {
  FilesIcon,
  FileTextIcon,
  FolderIcon,
  ImageIcon,
  LayoutDashboardIcon,
  MusicIcon,
  SettingsIcon,
  TrashIcon,
  UserIcon,
  VideoIcon,
} from "@/components/ui/icons";

export type NavItem = {
  label: string;
  href: string;
  icon: typeof FilesIcon;
};

export const NAV_SECTIONS: { title?: string; items: NavItem[] }[] = [
  {
    items: [
      { label: "Dashboard", href: "/dashboard", icon: LayoutDashboardIcon },
      { label: "All Files", href: "/dashboard/files", icon: FilesIcon },
    ],
  },
  {
    title: "Library",
    items: [
      { label: "Photos", href: "/dashboard/photos", icon: ImageIcon },
      { label: "Videos", href: "/dashboard/videos", icon: VideoIcon },
      { label: "Documents", href: "/dashboard/documents", icon: FileTextIcon },
      { label: "Audio", href: "/dashboard/audio", icon: MusicIcon },
      // { label: "Folders", href: "/dashboard/folders", icon: FolderIcon },
      { label: "Trash", href: "/dashboard/trash", icon: TrashIcon },
    ],
  },
  {
    title: "Account",
    items: [
      { label: "Settings", href: "/dashboard/settings", icon: SettingsIcon },
      { label: "Profile", href: "/dashboard/profile", icon: UserIcon },
    ],
  },
];
