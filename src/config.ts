import type {
    ExpressiveCodeConfig,
    LicenseConfig,
    NavBarConfig,
    ProfileConfig,
    SiteConfig,
} from "./types/config";

import { LinkPreset } from "./types/config";

export const siteConfig: SiteConfig = {
    title: "Marlobbz",
    subtitle: "Information Security Student Blog",
    lang: "zh_CN",
    themeColor: {
        hue: 215,
        fixed: false,
    },
    banner: {
        enable: false,
        src: "assets/images/demo-banner.png",
        position: "center",
        credit: {
            enable: false,
            text: "",
            url: "",
        },
    },
    toc: {
        enable: true,
        depth: 2,
    },
    favicon: [],
};

export const navBarConfig: NavBarConfig = {
    links: [
        LinkPreset.Home,
        LinkPreset.Archive,
        LinkPreset.About,
        {
            name: "GitHub",
            url: "https://github.com/Marlobbz",
            external: true,
        },
    ],
};

export const profileConfig: ProfileConfig = {
    avatar: "assets/images/admin.jpg",
    name: "Marlobbz",
    bio: "Information Security Student · C++ · Linux · CTF",
    links: [
        {
            name: "GitHub",
            icon: "fa6-brands:github",
            url: "https://github.com/Marlobbz",
        },
    ],
};

export const licenseConfig: LicenseConfig = {
    enable: true,
    name: "CC BY-NC-SA 4.0",
    url: "https://creativecommons.org/licenses/by-nc-sa/4.0/",
};

export const expressiveCodeConfig: ExpressiveCodeConfig = {
    theme: "github-dark",
};