"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.caseFileNumberDecoder = void 0;
const caseFileNumberDecoder = (id) => {
    const codeExp = id.split('-')[0];
    const codeAnio = id.split('-')[1];
    const codeIncidente = id.split('-')[2];
    const codeDistprov = id.split('-')[3];
    const codeOrgano = id.split('-')[4];
    const codEspecialidad = id.split('-')[5];
    const codInstancia = id.split('-')[6];
    return {
        codeExp,
        codeAnio,
        codeIncidente,
        codeDistprov,
        codeOrgano,
        codEspecialidad,
        codInstancia,
    };
};
exports.caseFileNumberDecoder = caseFileNumberDecoder;
