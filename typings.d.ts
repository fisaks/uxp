declare module "*.json" {
    const value: any;
    export default value;
}

declare module "*.scss" {
    interface IClassNames {
        [className: string]: string;
    }

    const classNames: IClassNames;
    export = classNames;
}

declare module '*.css';

declare module "*.module.css" {
    interface IClassNames {
        [className: string]: string;
    }

    const classNames: IClassNames;
    export = classNames;
}

declare module "*.yaml" {
    const value: any;
    export default value;
}

declare module 'html2pdf.js' {
    const html2pdf: {
        (): any;
        (element: Element | string): any;
        from: (element: Element | string) => {
            set: (opt: any) => {
                save: () => void;
                outputPdf: () => any;
            };
        };
    };
    export default html2pdf;
}
