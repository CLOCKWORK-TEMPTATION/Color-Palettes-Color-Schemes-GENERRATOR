import { Injectable, signal, computed } from '@angular/core';

// ═══════════════════════════════════════════════════════════════════════════════
// نظام التعلم من تفضيلات المستخدم باستخدام شبكة عصبية
// Preference Learning System using Neural Network
// ═══════════════════════════════════════════════════════════════════════════════
// 
// الهدف: تعلم تفضيلات المستخدم اللونية وتحسين دقة توليد الألوان المتباعدة
// 
// المدخلات: LAB + HSV features (6 قيم)
// المخرجات: احتمال التفضيل (0 = مكروه، 1 = مفضل)
//
// البنية: [6] → [32] → [16] → [8] → [1]
// ═══════════════════════════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════════════════════════
// Math Utilities for Neural Network
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * دوال التنشيط والمشتقات
 */
const Activations = {
  /**
   * ReLU - Rectified Linear Unit
   */
  relu: (x: number): number => Math.max(0, x),
  reluDerivative: (x: number): number => x > 0 ? 1 : 0,

  /**
   * Leaky ReLU - يمنع مشكلة "dying ReLU"
   */
  leakyRelu: (x: number, alpha: number = 0.01): number => 
    x > 0 ? x : alpha * x,
  leakyReluDerivative: (x: number, alpha: number = 0.01): number => 
    x > 0 ? 1 : alpha,

  /**
   * Sigmoid - للطبقة الأخيرة (احتمال بين 0 و 1)
   */
  sigmoid: (x: number): number => {
    // تجنب overflow
    if (x > 500) return 1;
    if (x < -500) return 0;
    return 1 / (1 + Math.exp(-x));
  },
  sigmoidDerivative: (x: number): number => {
    const s = Activations.sigmoid(x);
    return s * (1 - s);
  },

  /**
   * Tanh - بديل لـ ReLU في بعض الحالات
   */
  tanh: (x: number): number => Math.tanh(x),
  tanhDerivative: (x: number): number => 1 - Math.pow(Math.tanh(x), 2),

  /**
   * Swish - دالة حديثة تجمع مزايا ReLU و Sigmoid
   */
  swish: (x: number): number => x * Activations.sigmoid(x),
  swishDerivative: (x: number): number => {
    const s = Activations.sigmoid(x);
    return s + x * s * (1 - s);
  },
} as const;

/**
 * دوال الخسارة
 */
const LossFunctions = {
  /**
   * Binary Cross-Entropy - للتصنيف الثنائي
   */
  binaryCrossEntropy: (predicted: number, actual: number): number => {
    const epsilon = 1e-15;
    const p = Math.max(epsilon, Math.min(1 - epsilon, predicted));
    return -(actual * Math.log(p) + (1 - actual) * Math.log(1 - p));
  },
  binaryCrossEntropyDerivative: (predicted: number, actual: number): number => {
    const epsilon = 1e-15;
    const p = Math.max(epsilon, Math.min(1 - epsilon, predicted));
    return (p - actual) / (p * (1 - p) + epsilon);
  },

  /**
   * Mean Squared Error
   */
  mse: (predicted: number, actual: number): number => 
    Math.pow(predicted - actual, 2),
  mseDerivative: (predicted: number, actual: number): number => 
    2 * (predicted - actual),
} as const;

/**
 * مولد أرقام عشوائية بتوزيع Xavier/He
 */
class WeightInitializer {
  /**
   * Xavier initialization - مناسب لـ tanh و sigmoid
   */
  static xavier(fanIn: number, fanOut: number): number {
    const limit = Math.sqrt(6 / (fanIn + fanOut));
    return (Math.random() * 2 - 1) * limit;
  }

  /**
   * He initialization - مناسب لـ ReLU
   */
  static he(fanIn: number): number {
    const stddev = Math.sqrt(2 / fanIn);
    return WeightInitializer.gaussianRandom() * stddev;
  }

  /**
   * توليد رقم عشوائي بتوزيع Gaussian
   */
  static gaussianRandom(): number {
    let u = 0, v = 0;
    while (u === 0) u = Math.random();
    while (v === 0) v = Math.random();
    return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// Matrix Operations - عمليات المصفوفات
// ═══════════════════════════════════════════════════════════════════════════════

type Matrix = number[][];
type Vector = number[];

const MatrixOps = {
  /**
   * إنشاء مصفوفة بأبعاد محددة
   */
  create: (rows: number, cols: number, initializer: () => number): Matrix => {
    return Array.from({ length: rows }, () =>
      Array.from({ length: cols }, initializer)
    );
  },

  /**
   * إنشاء متجه
   */
  createVector: (size: number, initializer: () => number): Vector => {
    return Array.from({ length: size }, initializer);
  },

  /**
   * ضرب مصفوفة في متجه
   */
  multiplyMatrixVector: (matrix: Matrix, vector: Vector): Vector => {
    return matrix.map(row =>
      row.reduce((sum, val, i) => sum + val * vector[i], 0)
    );
  },

  /**
   * جمع متجهين
   */
  addVectors: (a: Vector, b: Vector): Vector => {
    return a.map((val, i) => val + b[i]);
  },

  /**
   * طرح متجهين
   */
  subtractVectors: (a: Vector, b: Vector): Vector => {
    return a.map((val, i) => val - b[i]);
  },

  /**
   * ضرب عنصري لمتجهين
   */
  multiplyElementwise: (a: Vector, b: Vector): Vector => {
    return a.map((val, i) => val * b[i]);
  },

  /**
   * ضرب متجه في عدد
   */
  scaleVector: (vector: Vector, scalar: number): Vector => {
    return vector.map(val => val * scalar);
  },

  /**
   * حاصل الضرب الخارجي (outer product)
   */
  outerProduct: (a: Vector, b: Vector): Matrix => {
    return a.map(ai => b.map(bi => ai * bi));
  },

  /**
   * تحويل المصفوفة (transpose)
   */
  transpose: (matrix: Matrix): Matrix => {
    if (matrix.length === 0) return [];
    return matrix[0].map((_, colIndex) => matrix.map(row => row[colIndex]));
  },

  /**
   * ضرب متجه في مصفوفة (من اليسار)
   */
  multiplyVectorMatrix: (vector: Vector, matrix: Matrix): Vector => {
    const transposed = MatrixOps.transpose(matrix);
    return transposed.map(col =>
      col.reduce((sum, val, i) => sum + val * vector[i], 0)
    );
  },

  /**
   * نسخ عميق للمصفوفة
   */
  clone: (matrix: Matrix): Matrix => {
    return matrix.map(row => [...row]);
  },

  /**
   * نسخ عميق للمتجه
   */
  cloneVector: (vector: Vector): Vector => {
    return [...vector];
  },
} as const;

// ═══════════════════════════════════════════════════════════════════════════════
// Neural Network Layer - طبقة الشبكة العصبية
// ═══════════════════════════════════════════════════════════════════════════════

type ActivationType = 'relu' | 'leakyRelu' | 'sigmoid' | 'tanh' | 'swish' | 'linear';

interface LayerConfig {
  inputSize: number;
  outputSize: number;
  activation: ActivationType;
  useBias: boolean;
  dropoutRate: number;
}

interface LayerState {
  weights: Matrix;
  biases: Vector;
  // للـ backpropagation
  lastInput: Vector;
  lastPreActivation: Vector;
  lastOutput: Vector;
  dropoutMask: Vector;
}

interface LayerGradients {
  weightGradients: Matrix;
  biasGradients: Vector;
}

class NeuralLayer {
  private config: LayerConfig;
  private state: LayerState;
  
  // Adam optimizer state
  private mWeights: Matrix;
  private vWeights: Matrix;
  private mBiases: Vector;
  private vBiases: Vector;
  private t: number = 0;

  constructor(config: LayerConfig) {
    this.config = config;
    
    // تهيئة الأوزان
    const initFn = config.activation === 'relu' || config.activation === 'leakyRelu'
      ? () => WeightInitializer.he(config.inputSize)
      : () => WeightInitializer.xavier(config.inputSize, config.outputSize);

    this.state = {
      weights: MatrixOps.create(config.outputSize, config.inputSize, initFn),
      biases: config.useBias 
        ? MatrixOps.createVector(config.outputSize, () => 0)
        : MatrixOps.createVector(config.outputSize, () => 0),
      lastInput: [],
      lastPreActivation: [],
      lastOutput: [],
      dropoutMask: [],
    };

    // تهيئة Adam optimizer
    this.mWeights = MatrixOps.create(config.outputSize, config.inputSize, () => 0);
    this.vWeights = MatrixOps.create(config.outputSize, config.inputSize, () => 0);
    this.mBiases = MatrixOps.createVector(config.outputSize, () => 0);
    this.vBiases = MatrixOps.createVector(config.outputSize, () => 0);
  }

  /**
   * التمرير الأمامي (Forward Pass)
   */
  forward(input: Vector, training: boolean = false): Vector {
    this.state.lastInput = input;

    // حساب z = Wx + b
    let preActivation = MatrixOps.multiplyMatrixVector(this.state.weights, input);
    if (this.config.useBias) {
      preActivation = MatrixOps.addVectors(preActivation, this.state.biases);
    }
    this.state.lastPreActivation = preActivation;

    // تطبيق دالة التنشيط
    let output = this.applyActivation(preActivation);

    // Dropout (فقط أثناء التدريب)
    if (training && this.config.dropoutRate > 0) {
      this.state.dropoutMask = output.map(() => 
        Math.random() > this.config.dropoutRate ? 1 / (1 - this.config.dropoutRate) : 0
      );
      output = MatrixOps.multiplyElementwise(output, this.state.dropoutMask);
    } else {
      this.state.dropoutMask = output.map(() => 1);
    }

    this.state.lastOutput = output;
    return output;
  }

  /**
   * التمرير الخلفي (Backward Pass)
   */
  backward(outputGradient: Vector): { inputGradient: Vector; gradients: LayerGradients } {
    // تطبيق dropout mask
    let gradient = MatrixOps.multiplyElementwise(outputGradient, this.state.dropoutMask);

    // مشتقة دالة التنشيط
    const activationDerivatives = this.applyActivationDerivative(this.state.lastPreActivation);
    gradient = MatrixOps.multiplyElementwise(gradient, activationDerivatives);

    // حساب تدرجات الأوزان: dW = gradient * input^T
    const weightGradients = MatrixOps.outerProduct(gradient, this.state.lastInput);

    // حساب تدرجات الانحياز
    const biasGradients = this.config.useBias ? gradient : gradient.map(() => 0);

    // حساب التدرج للطبقة السابقة: dInput = W^T * gradient
    const inputGradient = MatrixOps.multiplyVectorMatrix(gradient, this.state.weights);

    return {
      inputGradient,
      gradients: { weightGradients, biasGradients },
    };
  }

  /**
   * تحديث الأوزان باستخدام Adam optimizer
   */
  updateWeights(
    gradients: LayerGradients,
    learningRate: number,
    beta1: number = 0.9,
    beta2: number = 0.999,
    epsilon: number = 1e-8
  ): void {
    this.t++;

    // تحديث الأوزان
    for (let i = 0; i < this.state.weights.length; i++) {
      for (let j = 0; j < this.state.weights[i].length; j++) {
        // تحديث اللحظة الأولى
        this.mWeights[i][j] = beta1 * this.mWeights[i][j] + (1 - beta1) * gradients.weightGradients[i][j];
        // تحديث اللحظة الثانية
        this.vWeights[i][j] = beta2 * this.vWeights[i][j] + (1 - beta2) * Math.pow(gradients.weightGradients[i][j], 2);

        // تصحيح الانحياز
        const mHat = this.mWeights[i][j] / (1 - Math.pow(beta1, this.t));
        const vHat = this.vWeights[i][j] / (1 - Math.pow(beta2, this.t));

        // تحديث الوزن
        this.state.weights[i][j] -= learningRate * mHat / (Math.sqrt(vHat) + epsilon);
      }
    }

    // تحديث الانحياز
    if (this.config.useBias) {
      for (let i = 0; i < this.state.biases.length; i++) {
        this.mBiases[i] = beta1 * this.mBiases[i] + (1 - beta1) * gradients.biasGradients[i];
        this.vBiases[i] = beta2 * this.vBiases[i] + (1 - beta2) * Math.pow(gradients.biasGradients[i], 2);

        const mHat = this.mBiases[i] / (1 - Math.pow(beta1, this.t));
        const vHat = this.vBiases[i] / (1 - Math.pow(beta2, this.t));

        this.state.biases[i] -= learningRate * mHat / (Math.sqrt(vHat) + epsilon);
      }
    }
  }

  /**
   * L2 Regularization
   */
  getL2Penalty(lambda: number): number {
    let penalty = 0;
    for (const row of this.state.weights) {
      for (const w of row) {
        penalty += w * w;
      }
    }
    return lambda * penalty / 2;
  }

  /**
   * إضافة L2 gradient
   */
  addL2Gradient(gradients: LayerGradients, lambda: number): void {
    for (let i = 0; i < gradients.weightGradients.length; i++) {
      for (let j = 0; j < gradients.weightGradients[i].length; j++) {
        gradients.weightGradients[i][j] += lambda * this.state.weights[i][j];
      }
    }
  }

  private applyActivation(values: Vector): Vector {
    switch (this.config.activation) {
      case 'relu':
        return values.map(Activations.relu);
      case 'leakyRelu':
        return values.map(v => Activations.leakyRelu(v));
      case 'sigmoid':
        return values.map(Activations.sigmoid);
      case 'tanh':
        return values.map(Activations.tanh);
      case 'swish':
        return values.map(Activations.swish);
      case 'linear':
        return values;
      default:
        return values;
    }
  }

  private applyActivationDerivative(values: Vector): Vector {
    switch (this.config.activation) {
      case 'relu':
        return values.map(Activations.reluDerivative);
      case 'leakyRelu':
        return values.map(v => Activations.leakyReluDerivative(v));
      case 'sigmoid':
        return values.map(Activations.sigmoidDerivative);
      case 'tanh':
        return values.map(Activations.tanhDerivative);
      case 'swish':
        return values.map(Activations.swishDerivative);
      case 'linear':
        return values.map(() => 1);
      default:
        return values.map(() => 1);
    }
  }

  /**
   * تصدير حالة الطبقة للحفظ
   */
  exportState(): { weights: Matrix; biases: Vector } {
    return {
      weights: MatrixOps.clone(this.state.weights),
      biases: MatrixOps.cloneVector(this.state.biases),
    };
  }

  /**
   * استيراد حالة الطبقة
   */
  importState(state: { weights: Matrix; biases: Vector }): void {
    this.state.weights = MatrixOps.clone(state.weights);
    this.state.biases = MatrixOps.cloneVector(state.biases);
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// Neural Network - الشبكة العصبية الكاملة
// ═══════════════════════════════════════════════════════════════════════════════

interface NetworkConfig {
  inputSize: number;
  hiddenLayers: Array<{ size: number; activation: ActivationType; dropout?: number }>;
  outputSize: number;
  outputActivation: ActivationType;
  learningRate: number;
  l2Lambda: number;
}

interface TrainingConfig {
  epochs: number;
  batchSize: number;
  validationSplit: number;
  earlyStoppingPatience: number;
  minDelta: number;
  verbose: boolean;
}

interface TrainingSample {
  input: Vector;
  target: number;
}

interface TrainingHistory {
  epoch: number;
  trainLoss: number;
  valLoss: number;
  trainAccuracy: number;
  valAccuracy: number;
}

class NeuralNetwork {
  private layers: NeuralLayer[];
  private config: NetworkConfig;

  constructor(config: NetworkConfig) {
    this.config = config;
    this.layers = [];

    let currentInputSize = config.inputSize;

    // إنشاء الطبقات المخفية
    for (const layerDef of config.hiddenLayers) {
      this.layers.push(new NeuralLayer({
        inputSize: currentInputSize,
        outputSize: layerDef.size,
        activation: layerDef.activation,
        useBias: true,
        dropoutRate: layerDef.dropout ?? 0,
      }));
      currentInputSize = layerDef.size;
    }

    // إنشاء طبقة المخرجات
    this.layers.push(new NeuralLayer({
      inputSize: currentInputSize,
      outputSize: config.outputSize,
      activation: config.outputActivation,
      useBias: true,
      dropoutRate: 0,
    }));
  }

  /**
   * التنبؤ
   */
  predict(input: Vector): Vector {
    let current = input;
    for (const layer of this.layers) {
      current = layer.forward(current, false);
    }
    return current;
  }

  /**
   * التمرير الأمامي (للتدريب)
   */
  private forwardTraining(input: Vector): Vector {
    let current = input;
    for (const layer of this.layers) {
      current = layer.forward(current, true);
    }
    return current;
  }

  /**
   * التدريب على دفعة واحدة
   */
  private trainBatch(batch: TrainingSample[]): number {
    let totalLoss = 0;
    const allGradients: LayerGradients[][] = [];

    for (const sample of batch) {
      // Forward pass
      const output = this.forwardTraining(sample.input);
      const predicted = output[0];
      
      // حساب الخسارة
      totalLoss += LossFunctions.binaryCrossEntropy(predicted, sample.target);

      // حساب تدرج الخسارة
      let gradient: Vector = [LossFunctions.binaryCrossEntropyDerivative(predicted, sample.target)];

      // Backward pass
      const sampleGradients: LayerGradients[] = [];
      for (let i = this.layers.length - 1; i >= 0; i--) {
        const result = this.layers[i].backward(gradient);
        sampleGradients.unshift(result.gradients);
        gradient = result.inputGradient;
      }
      allGradients.push(sampleGradients);
    }

    // تجميع التدرجات وتحديث الأوزان
    for (let layerIdx = 0; layerIdx < this.layers.length; layerIdx++) {
      const avgGradients: LayerGradients = {
        weightGradients: MatrixOps.create(
          allGradients[0][layerIdx].weightGradients.length,
          allGradients[0][layerIdx].weightGradients[0].length,
          () => 0
        ),
        biasGradients: MatrixOps.createVector(
          allGradients[0][layerIdx].biasGradients.length,
          () => 0
        ),
      };

      // تجميع التدرجات
      for (const sampleGradients of allGradients) {
        const g = sampleGradients[layerIdx];
        for (let i = 0; i < avgGradients.weightGradients.length; i++) {
          for (let j = 0; j < avgGradients.weightGradients[i].length; j++) {
            avgGradients.weightGradients[i][j] += g.weightGradients[i][j] / batch.length;
          }
        }
        for (let i = 0; i < avgGradients.biasGradients.length; i++) {
          avgGradients.biasGradients[i] += g.biasGradients[i] / batch.length;
        }
      }

      // إضافة L2 regularization
      if (this.config.l2Lambda > 0) {
        this.layers[layerIdx].addL2Gradient(avgGradients, this.config.l2Lambda);
        totalLoss += this.layers[layerIdx].getL2Penalty(this.config.l2Lambda);
      }

      // تحديث الأوزان
      this.layers[layerIdx].updateWeights(avgGradients, this.config.learningRate);
    }

    return totalLoss / batch.length;
  }

  /**
   * تقييم النموذج
   */
  evaluate(samples: TrainingSample[]): { loss: number; accuracy: number } {
    if (samples.length === 0) return { loss: 0, accuracy: 0 };

    let totalLoss = 0;
    let correct = 0;

    for (const sample of samples) {
      const output = this.predict(sample.input);
      const predicted = output[0];
      
      totalLoss += LossFunctions.binaryCrossEntropy(predicted, sample.target);
      
      const predictedClass = predicted >= 0.5 ? 1 : 0;
      if (predictedClass === sample.target) correct++;
    }

    return {
      loss: totalLoss / samples.length,
      accuracy: correct / samples.length,
    };
  }

  /**
   * التدريب الكامل
   */
  train(
    data: TrainingSample[],
    config: TrainingConfig
  ): TrainingHistory[] {
    const history: TrainingHistory[] = [];
    
    // خلط البيانات
    const shuffled = [...data].sort(() => Math.random() - 0.5);
    
    // تقسيم البيانات
    const valSize = Math.floor(shuffled.length * config.validationSplit);
    const valData = shuffled.slice(0, valSize);
    const trainData = shuffled.slice(valSize);

    let bestValLoss = Infinity;
    let patienceCounter = 0;

    for (let epoch = 0; epoch < config.epochs; epoch++) {
      // خلط بيانات التدريب
      const epochData = [...trainData].sort(() => Math.random() - 0.5);
      
      let epochLoss = 0;
      let batchCount = 0;

      // التدريب على دفعات
      for (let i = 0; i < epochData.length; i += config.batchSize) {
        const batch = epochData.slice(i, i + config.batchSize);
        epochLoss += this.trainBatch(batch);
        batchCount++;
      }

      const trainMetrics = this.evaluate(trainData);
      const valMetrics = valData.length > 0 
        ? this.evaluate(valData) 
        : { loss: 0, accuracy: 0 };

      const historyEntry: TrainingHistory = {
        epoch: epoch + 1,
        trainLoss: trainMetrics.loss,
        valLoss: valMetrics.loss,
        trainAccuracy: trainMetrics.accuracy,
        valAccuracy: valMetrics.accuracy,
      };
      history.push(historyEntry);

      if (config.verbose) {
        console.log(
          `Epoch ${epoch + 1}/${config.epochs} - ` +
          `Loss: ${trainMetrics.loss.toFixed(4)} - ` +
          `Acc: ${(trainMetrics.accuracy * 100).toFixed(1)}% - ` +
          `Val Loss: ${valMetrics.loss.toFixed(4)} - ` +
          `Val Acc: ${(valMetrics.accuracy * 100).toFixed(1)}%`
        );
      }

      // Early stopping
      if (valData.length > 0) {
        if (valMetrics.loss < bestValLoss - config.minDelta) {
          bestValLoss = valMetrics.loss;
          patienceCounter = 0;
        } else {
          patienceCounter++;
          if (patienceCounter >= config.earlyStoppingPatience) {
            if (config.verbose) {
              console.log(`Early stopping at epoch ${epoch + 1}`);
            }
            break;
          }
        }
      }
    }

    return history;
  }

  /**
   * تصدير النموذج
   */
  export(): { config: NetworkConfig; layers: Array<{ weights: Matrix; biases: Vector }> } {
    return {
      config: { ...this.config },
      layers: this.layers.map(layer => layer.exportState()),
    };
  }

  /**
   * استيراد النموذج
   */
  import(data: { config: NetworkConfig; layers: Array<{ weights: Matrix; biases: Vector }> }): void {
    if (data.layers.length !== this.layers.length) {
      throw new Error('Layer count mismatch');
    }
    for (let i = 0; i < this.layers.length; i++) {
      this.layers[i].importState(data.layers[i]);
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// Feature Extractor - استخراج السمات من الألوان
// ═══════════════════════════════════════════════════════════════════════════════

interface ColorFeatures {
  // LAB normalized (0-1)
  L: number;
  a: number;
  b: number;
  // HSV normalized (0-1)
  h: number;
  s: number;
  v: number;
}

class ColorFeatureExtractor {
  /**
   * استخراج السمات من لون Hex
   */
  static extractFromHex(hex: string): ColorFeatures {
    const rgb = this.hexToRgb(hex);
    const lab = this.rgbToLab(rgb);
    const hsv = this.rgbToHsv(rgb);

    return {
      // تطبيع LAB
      L: lab.L / 100,
      a: (lab.a + 128) / 255,
      b: (lab.b + 128) / 255,
      // تطبيع HSV
      h: hsv.h / 360,
      s: hsv.s,
      v: hsv.v,
    };
  }

  /**
   * تحويل السمات إلى متجه
   */
  static toVector(features: ColorFeatures): Vector {
    return [features.L, features.a, features.b, features.h, features.s, features.v];
  }

  /**
   * استخراج متجه مباشرة من Hex
   */
  static hexToVector(hex: string): Vector {
    return this.toVector(this.extractFromHex(hex));
  }

  private static hexToRgb(hex: string): { r: number; g: number; b: number } {
    const cleanHex = hex.replace(/^#/, '');
    return {
      r: parseInt(cleanHex.substring(0, 2), 16),
      g: parseInt(cleanHex.substring(2, 4), 16),
      b: parseInt(cleanHex.substring(4, 6), 16),
    };
  }

  private static rgbToLab(rgb: { r: number; g: number; b: number }): { L: number; a: number; b: number } {
    // RGB to XYZ
    let r = rgb.r / 255;
    let g = rgb.g / 255;
    let b = rgb.b / 255;

    r = r > 0.04045 ? Math.pow((r + 0.055) / 1.055, 2.4) : r / 12.92;
    g = g > 0.04045 ? Math.pow((g + 0.055) / 1.055, 2.4) : g / 12.92;
    b = b > 0.04045 ? Math.pow((b + 0.055) / 1.055, 2.4) : b / 12.92;

    const x = (r * 0.4124564 + g * 0.3575761 + b * 0.1804375) * 100;
    const y = (r * 0.2126729 + g * 0.7151522 + b * 0.0721750) * 100;
    const z = (r * 0.0193339 + g * 0.1191920 + b * 0.9503041) * 100;

    // XYZ to LAB
    const refX = 95.047, refY = 100.0, refZ = 108.883;
    const f = (t: number) => t > Math.pow(6/29, 3) ? Math.pow(t, 1/3) : t / (3 * Math.pow(6/29, 2)) + 4/29;

    return {
      L: 116 * f(y / refY) - 16,
      a: 500 * (f(x / refX) - f(y / refY)),
      b: 200 * (f(y / refY) - f(z / refZ)),
    };
  }

  private static rgbToHsv(rgb: { r: number; g: number; b: number }): { h: number; s: number; v: number } {
    const r = rgb.r / 255;
    const g = rgb.g / 255;
    const b = rgb.b / 255;

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const delta = max - min;

    let h = 0;
    if (delta !== 0) {
      if (max === r) h = ((g - b) / delta + (g < b ? 6 : 0)) * 60;
      else if (max === g) h = ((b - r) / delta + 2) * 60;
      else h = ((r - g) / delta + 4) * 60;
    }

    return {
      h,
      s: max === 0 ? 0 : delta / max,
      v: max,
    };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// Preference Learning Service - خدمة التعلم من التفضيلات
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * عينة تفضيل
 */
export interface PreferenceSample {
  hex: string;
  isPreferred: boolean;
  timestamp: number;
  source: 'saved' | 'generated' | 'antiPalette' | 'clicked' | 'explicit';
}

/**
 * إعدادات نظام التعلم
 */
export interface LearningConfig {
  minSamplesForTraining: number;
  autoTrainThreshold: number;
  maxStoredSamples: number;
  trainingEpochs: number;
  batchSize: number;
  learningRate: number;
  confidenceThreshold: number;
}

const DEFAULT_LEARNING_CONFIG: LearningConfig = {
  minSamplesForTraining: 20,
  autoTrainThreshold: 50,
  maxStoredSamples: 1000,
  trainingEpochs: 100,
  batchSize: 16,
  learningRate: 0.001,
  confidenceThreshold: 0.7,
};

/**
 * حالة النموذج
 */
export interface ModelState {
  isTrained: boolean;
  samplesCount: number;
  preferredCount: number;
  dislikedCount: number;
  lastTrainingAccuracy: number;
  lastTrainingLoss: number;
  lastTrainedAt: number | null;
}

@Injectable({
  providedIn: 'root'
})
export class PreferenceLearningService {
  private network: NeuralNetwork;
  private samples: PreferenceSample[] = [];
  private config: LearningConfig;
  
  // Reactive state
  private _modelState = signal<ModelState>({
    isTrained: false,
    samplesCount: 0,
    preferredCount: 0,
    dislikedCount: 0,
    lastTrainingAccuracy: 0,
    lastTrainingLoss: 0,
    lastTrainedAt: null,
  });

  readonly modelState = this._modelState.asReadonly();
  readonly isReady = computed(() => this._modelState().isTrained);
  readonly confidence = computed(() => {
    const state = this._modelState();
    if (!state.isTrained) return 0;
    return Math.min(1, state.samplesCount / 100) * state.lastTrainingAccuracy;
  });

  private readonly STORAGE_KEY = 'chromagen_preference_model';
  private readonly SAMPLES_KEY = 'chromagen_preference_samples';

  constructor() {
    this.config = { ...DEFAULT_LEARNING_CONFIG };
    
    // إنشاء الشبكة العصبية
    this.network = new NeuralNetwork({
      inputSize: 6,  // LAB + HSV
      hiddenLayers: [
        { size: 32, activation: 'leakyRelu', dropout: 0.1 },
        { size: 16, activation: 'leakyRelu', dropout: 0.1 },
        { size: 8, activation: 'leakyRelu', dropout: 0 },
      ],
      outputSize: 1,
      outputActivation: 'sigmoid',
      learningRate: this.config.learningRate,
      l2Lambda: 0.0001,
    });

    // تحميل البيانات المحفوظة
    this.loadFromStorage();
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Public API - واجهة الاستخدام
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * إضافة لون مفضل (عند حفظ palette)
   */
  addPreferredColor(hex: string, source: PreferenceSample['source'] = 'saved'): void {
    this.addSample({ hex, isPreferred: true, timestamp: Date.now(), source });
  }

  /**
   * إضافة ألوان مفضلة (من palette كامل)
   */
  addPreferredColors(hexColors: string[], source: PreferenceSample['source'] = 'saved'): void {
    hexColors.forEach(hex => this.addPreferredColor(hex, source));
  }

  /**
   * إضافة لون مكروه (من anti-palette)
   */
  addDislikedColor(hex: string, source: PreferenceSample['source'] = 'antiPalette'): void {
    this.addSample({ hex, isPreferred: false, timestamp: Date.now(), source });
  }

  /**
   * إضافة ألوان مكروهة
   */
  addDislikedColors(hexColors: string[], source: PreferenceSample['source'] = 'antiPalette'): void {
    hexColors.forEach(hex => this.addDislikedColor(hex, source));
  }

  /**
   * تسجيل تفاعل المستخدم (نقرة على لون = مفضل ضمني)
   */
  recordInteraction(hex: string, isPositive: boolean = true): void {
    this.addSample({
      hex,
      isPreferred: isPositive,
      timestamp: Date.now(),
      source: 'clicked',
    });
  }

  /**
   * التنبؤ باحتمال التفضيل
   * @returns رقم بين 0 (مكروه) و 1 (مفضل)
   */
  predictPreference(hex: string): number {
    if (!this._modelState().isTrained) {
      return 0.5; // لا يوجد نموذج، نرجع قيمة محايدة
    }

    const features = ColorFeatureExtractor.hexToVector(hex);
    const output = this.network.predict(features);
    return output[0];
  }

  /**
   * التنبؤ لقائمة ألوان
   */
  predictPreferences(hexColors: string[]): Map<string, number> {
    const predictions = new Map<string, number>();
    for (const hex of hexColors) {
      predictions.set(hex, this.predictPreference(hex));
    }
    return predictions;
  }

  /**
   * تصنيف لون (مفضل/محايد/مكروه)
   */
  classifyColor(hex: string): 'preferred' | 'neutral' | 'disliked' {
    const score = this.predictPreference(hex);
    if (score >= this.config.confidenceThreshold) return 'preferred';
    if (score <= 1 - this.config.confidenceThreshold) return 'disliked';
    return 'neutral';
  }

  /**
   * فلترة الألوان بناءً على التفضيل
   */
  filterByPreference(
    hexColors: string[],
    type: 'preferred' | 'disliked' | 'all'
  ): string[] {
    if (!this._modelState().isTrained) return hexColors;

    return hexColors.filter(hex => {
      const classification = this.classifyColor(hex);
      if (type === 'all') return true;
      return classification === type;
    });
  }

  /**
   * ترتيب الألوان بناءً على التفضيل
   */
  sortByPreference(hexColors: string[], ascending: boolean = false): string[] {
    const predictions = this.predictPreferences(hexColors);
    
    return [...hexColors].sort((a, b) => {
      const scoreA = predictions.get(a) ?? 0.5;
      const scoreB = predictions.get(b) ?? 0.5;
      return ascending ? scoreA - scoreB : scoreB - scoreA;
    });
  }

  /**
   * تدريب النموذج يدوياً
   */
  async train(verbose: boolean = false): Promise<TrainingHistory[]> {
    if (this.samples.length < this.config.minSamplesForTraining) {
      throw new Error(
        `Not enough samples. Need at least ${this.config.minSamplesForTraining}, ` +
        `have ${this.samples.length}`
      );
    }

    // تحضير بيانات التدريب
    const trainingSamples: TrainingSample[] = this.samples.map(sample => ({
      input: ColorFeatureExtractor.hexToVector(sample.hex),
      target: sample.isPreferred ? 1 : 0,
    }));

    // التدريب
    const history = this.network.train(trainingSamples, {
      epochs: this.config.trainingEpochs,
      batchSize: this.config.batchSize,
      validationSplit: 0.2,
      earlyStoppingPatience: 10,
      minDelta: 0.001,
      verbose,
    });

    // تحديث الحالة
    const lastEpoch = history[history.length - 1];
    this._modelState.update(state => ({
      ...state,
      isTrained: true,
      lastTrainingAccuracy: lastEpoch?.valAccuracy ?? lastEpoch?.trainAccuracy ?? 0,
      lastTrainingLoss: lastEpoch?.valLoss ?? lastEpoch?.trainLoss ?? 0,
      lastTrainedAt: Date.now(),
    }));

    // حفظ النموذج
    this.saveToStorage();

    return history;
  }

  /**
   * إعادة ضبط النموذج
   */
  reset(): void {
    this.samples = [];
    this.network = new NeuralNetwork({
      inputSize: 6,
      hiddenLayers: [
        { size: 32, activation: 'leakyRelu', dropout: 0.1 },
        { size: 16, activation: 'leakyRelu', dropout: 0.1 },
        { size: 8, activation: 'leakyRelu', dropout: 0 },
      ],
      outputSize: 1,
      outputActivation: 'sigmoid',
      learningRate: this.config.learningRate,
      l2Lambda: 0.0001,
    });

    this._modelState.set({
      isTrained: false,
      samplesCount: 0,
      preferredCount: 0,
      dislikedCount: 0,
      lastTrainingAccuracy: 0,
      lastTrainingLoss: 0,
      lastTrainedAt: null,
    });

    this.clearStorage();
  }

  /**
   * تحديث الإعدادات
   */
  updateConfig(updates: Partial<LearningConfig>): void {
    this.config = { ...this.config, ...updates };
  }

  /**
   * الحصول على الإعدادات
   */
  getConfig(): Readonly<LearningConfig> {
    return this.config;
  }

  /**
   * الحصول على العينات
   */
  getSamples(): ReadonlyArray<PreferenceSample> {
    return this.samples;
  }

  /**
   * تصدير النموذج والبيانات
   */
  export(): string {
    return JSON.stringify({
      model: this.network.export(),
      samples: this.samples,
      config: this.config,
      state: this._modelState(),
    });
  }

  /**
   * استيراد نموذج
   */
  import(jsonData: string): void {
    try {
      const data = JSON.parse(jsonData);
      
      if (data.model) {
        this.network.import(data.model);
      }
      if (data.samples) {
        this.samples = data.samples;
      }
      if (data.state) {
        this._modelState.set(data.state);
      }
      
      this.updateStateFromSamples();
      this.saveToStorage();
    } catch (error) {
      throw new Error('Invalid model data');
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Integration Helpers - مساعدات التكامل
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * تحسين توليد Anti-Palette باستخدام النموذج
   * يُرجع ألوان مرتبة حسب احتمال أن تكون مكروهة
   */
  enhanceAntiPaletteGeneration(candidateHexColors: string[]): string[] {
    if (!this._modelState().isTrained) {
      return candidateHexColors;
    }

    // ترتيب الألوان من الأكثر احتمالاً لأن تكون مكروهة إلى الأقل
    return this.sortByPreference(candidateHexColors, true);
  }

  /**
   * الحصول على "Score" للون يجمع بين DeltaE والتفضيل المتعلم
   */
  getCombinedScore(
    hex: string,
    deltaEScore: number,
    preferenceWeight: number = 0.3
  ): number {
    const preferenceScore = 1 - this.predictPreference(hex); // نريد الألوان المكروهة
    return (1 - preferenceWeight) * deltaEScore + preferenceWeight * preferenceScore;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Private Methods
  // ═══════════════════════════════════════════════════════════════════════════

  private addSample(sample: PreferenceSample): void {
    // تجنب التكرار
    const existingIndex = this.samples.findIndex(s => s.hex.toLowerCase() === sample.hex.toLowerCase());
    if (existingIndex !== -1) {
      // تحديث العينة الموجودة إذا كانت أحدث
      if (sample.timestamp > this.samples[existingIndex].timestamp) {
        this.samples[existingIndex] = sample;
      }
    } else {
      this.samples.push(sample);
    }

    // تنظيف العينات القديمة
    if (this.samples.length > this.config.maxStoredSamples) {
      this.samples.sort((a, b) => b.timestamp - a.timestamp);
      this.samples = this.samples.slice(0, this.config.maxStoredSamples);
    }

    this.updateStateFromSamples();
    this.saveToStorage();

    // تدريب تلقائي
    if (
      this.samples.length >= this.config.autoTrainThreshold &&
      this.samples.length % this.config.autoTrainThreshold === 0
    ) {
      this.train(false).catch(console.error);
    }
  }

  private updateStateFromSamples(): void {
    const preferred = this.samples.filter(s => s.isPreferred).length;
    const disliked = this.samples.length - preferred;

    this._modelState.update(state => ({
      ...state,
      samplesCount: this.samples.length,
      preferredCount: preferred,
      dislikedCount: disliked,
    }));
  }

  private saveToStorage(): void {
    try {
      localStorage.setItem(this.SAMPLES_KEY, JSON.stringify(this.samples));
      
      if (this._modelState().isTrained) {
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify({
          model: this.network.export(),
          state: this._modelState(),
        }));
      }
    } catch (error) {
      console.error('Failed to save preference model:', error);
    }
  }

  private loadFromStorage(): void {
    try {
      // تحميل العينات
      const samplesData = localStorage.getItem(this.SAMPLES_KEY);
      if (samplesData) {
        this.samples = JSON.parse(samplesData);
        this.updateStateFromSamples();
      }

      // تحميل النموذج
      const modelData = localStorage.getItem(this.STORAGE_KEY);
      if (modelData) {
        const parsed = JSON.parse(modelData);
        if (parsed.model) {
          this.network.import(parsed.model);
        }
        if (parsed.state) {
          this._modelState.set({
            ...this._modelState(),
            ...parsed.state,
          });
        }
      }
    } catch (error) {
      console.error('Failed to load preference model:', error);
    }
  }

  private clearStorage(): void {
    try {
      localStorage.removeItem(this.SAMPLES_KEY);
      localStorage.removeItem(this.STORAGE_KEY);
    } catch (error) {
      console.error('Failed to clear preference storage:', error);
    }
  }
}
