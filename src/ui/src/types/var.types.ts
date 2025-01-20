export type VarsContextType = {
    cal: Record<string, any>;
    car: Record<string, any>;
    mail: Record<string, any>;
    setVar: (group: "cal" | "car" | "mail", key: string, value: any) => void;
    getVar: (group: "cal" | "car" | "mail", key: string) => any;
    resetVars: (group: "cal" | "car" | "mail") => void;
};