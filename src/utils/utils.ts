// export const isDevelopment = !environment.production;

export const formatNumber = (num: any) => {
  return new Intl.NumberFormat('en-US').format(Number(num));
};

export const disableBodyScroll = () => {
  document.body.classList.add('block-scroll');
};

export const enableBodyScroll = () => {
  document.body.classList.remove('block-scroll');
};

export const encode = (data: any) => {
  return typeof data === 'string' ? btoa(data) : btoa(jsonStringify(data));
};

export const decode = (data: string) => {
  return atob(data);
};

export const trim = (data: string) => {
  return data.trim();
};

export const isEmpty = (obj: any) => {
  if (!obj || obj == null || obj == '' || obj?.length === 0 || JSON.stringify(obj) === '{}') return true;
  else return false;
};

export const jsonParse = <T = any>(obj: any): T => {
  try {
    if (typeof obj != 'string') return JSON.parse(jsonStringify(obj));
    return JSON.parse(obj);
  } catch (_) {
    return obj;
  }
};

export const jsonStringify = (obj: any): string => {
  const stringify = require('json-stringify-deterministic');
  return stringify(obj);
};

export const capitalize = (str: string) => {
  if (isEmpty(str)) return '';
  return str
    .split(' ')
    .map((w) => w[0].toUpperCase() + w.substring(1))
    .join(' ');
};

export const capitalizeFirstLetter = (data: string) => {
  return isEmpty(data) ? '' : data.charAt(0).toUpperCase() + data.slice(1);
};

export const sortArrayByLabelProperty = (a: any, b: any) => {
  if (a.label > b.label) return 1;
  if (a.label < b.label) return -1;
  return 0;
};

export const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (error) => reject(error);
  });
};

// export const getImageSrc = (filePath: string, size?: number) => {
//   if (['http://', 'https://', 'data:image'].some((v) => filePath?.includes(v))) return filePath;
//   let url = `https://res.cloudinary.com/${environment.cloudinary.cloudName}/image/upload/`;
//   if (size) url += `c_fill,h_${size},w_${size}/`;
//   return url + filePath;
// };

export const toLetter = (num: number) => {
  // if (num < 0 || num > 25) {
  //   throw new Error('Number must be between 0 and 25');
  // }
  return String.fromCharCode(num + 97);
};

export const filterUniqueArr = (arr: any[], key?: string) => {
  if (key) {
    return arr.filter((v, i, self) => self.findIndex((obj) => obj.id === v.id) === i);
  }
  return arr.filter((v, i, self) => self.indexOf(v) === i);
};

export const clearLocalStorage = () => {
  localStorage.clear();
};

export const refreshPage = () => {
  window.location.reload();
};

export const snakeToTitleCase = (str: string) => {
  return str
    .split('_')
    .map((word) => {
      if (word === word.toUpperCase()) return word; // preserve acronyms
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(' ');
};

export const runWithConcurrencyLimit = async (tasks: any[], concurrency: number) => {
  const results: any[] = [];
  const executing: any[] = [];

  for (const task of tasks) {
    // Add task to executing list
    const p = task().then((res: any) => {
      results.push(res);
      executing.splice(executing.indexOf(p), 1);
    });

    executing.push(p);

    // Limit the number of concurrent executions
    if (executing.length >= concurrency) {
      await Promise.race(executing); // Wait for any of the executing tasks to complete
    }
  }

  // Wait for all remaining tasks to finish
  await Promise.all(executing);

  return results;
};

export const isMobile = window.innerWidth < 768;
export const isDesktop = !isMobile;
