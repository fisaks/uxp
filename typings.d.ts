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
