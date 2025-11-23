//
//  CustomButton.swift
//  SolPlayer
//
//  Created by Morioka Naoya on H28/07/11.
//  Copyright © 平成28年 Morioka Naoya. All rights reserved.
//

import Foundation
import UIKit

@IBDesignable class CustomButton: UIButton {
    
    //角丸の半径
    @IBInspectable var cornerRadius: CGFloat = 0.0
    
    //枠
    @IBInspectable var borderColor: UIColor = UIColor.clear
    @IBInspectable var borderWidth: CGFloat = 0.0
    
    override func draw(_ rect: CGRect) {
        //角丸
        self.layer.cornerRadius = cornerRadius
        self.clipsToBounds = (cornerRadius > 0)
        
        //枠線
        self.layer.borderColor = borderColor.cgColor
        self.layer.borderWidth = borderWidth
        
        super.draw(rect)
    }
    
}
